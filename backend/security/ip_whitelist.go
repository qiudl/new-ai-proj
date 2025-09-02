package security

import (
	"fmt"
	"net"
	"net/http"
	"strings"
)

// IPWhitelistValidator handles IP address validation against whitelists
type IPWhitelistValidator struct {
	// Global whitelist that applies to all requests
	GlobalWhitelist []net.IPNet

	// Configuration
	TrustedProxyHeaders []string // Headers to check for real IP (e.g., X-Forwarded-For)
	AllowLocalhost      bool     // Whether to allow localhost connections
	AllowPrivateIPs     bool     // Whether to allow private IP ranges
}

// NewIPWhitelistValidator creates a new IP whitelist validator
func NewIPWhitelistValidator() *IPWhitelistValidator {
	return &IPWhitelistValidator{
		GlobalWhitelist: []net.IPNet{},
		TrustedProxyHeaders: []string{
			"X-Forwarded-For",
			"X-Real-IP",
			"CF-Connecting-IP", // Cloudflare
			"True-Client-IP",   // Akamai and Cloudflare
		},
		AllowLocalhost:  true,
		AllowPrivateIPs: true,
	}
}

// AddGlobalWhitelist adds an IP or CIDR range to the global whitelist
func (ipv *IPWhitelistValidator) AddGlobalWhitelist(ipOrCIDR string) error {
	return ipv.addToWhitelist(&ipv.GlobalWhitelist, ipOrCIDR)
}

// RemoveGlobalWhitelist removes an IP or CIDR range from the global whitelist
func (ipv *IPWhitelistValidator) RemoveGlobalWhitelist(ipOrCIDR string) error {
	return ipv.removeFromWhitelist(&ipv.GlobalWhitelist, ipOrCIDR)
}

// addToWhitelist adds an IP or CIDR range to a whitelist
func (ipv *IPWhitelistValidator) addToWhitelist(whitelist *[]net.IPNet, ipOrCIDR string) error {
	// Handle single IP (add /32 or /128 suffix)
	if !strings.Contains(ipOrCIDR, "/") {
		ip := net.ParseIP(ipOrCIDR)
		if ip == nil {
			return fmt.Errorf("invalid IP address: %s", ipOrCIDR)
		}
		if ip.To4() != nil {
			ipOrCIDR += "/32" // IPv4
		} else {
			ipOrCIDR += "/128" // IPv6
		}
	}

	// Parse CIDR
	_, ipNet, err := net.ParseCIDR(ipOrCIDR)
	if err != nil {
		return fmt.Errorf("invalid CIDR: %s - %w", ipOrCIDR, err)
	}

	// Check if already exists
	for _, existing := range *whitelist {
		if existing.String() == ipNet.String() {
			return fmt.Errorf("IP/CIDR already exists in whitelist: %s", ipOrCIDR)
		}
	}

	*whitelist = append(*whitelist, *ipNet)
	return nil
}

// removeFromWhitelist removes an IP or CIDR range from a whitelist
func (ipv *IPWhitelistValidator) removeFromWhitelist(whitelist *[]net.IPNet, ipOrCIDR string) error {
	// Handle single IP (add /32 or /128 suffix)
	if !strings.Contains(ipOrCIDR, "/") {
		ip := net.ParseIP(ipOrCIDR)
		if ip == nil {
			return fmt.Errorf("invalid IP address: %s", ipOrCIDR)
		}
		if ip.To4() != nil {
			ipOrCIDR += "/32" // IPv4
		} else {
			ipOrCIDR += "/128" // IPv6
		}
	}

	// Parse CIDR
	_, ipNet, err := net.ParseCIDR(ipOrCIDR)
	if err != nil {
		return fmt.Errorf("invalid CIDR: %s - %w", ipOrCIDR, err)
	}

	// Find and remove
	for i, existing := range *whitelist {
		if existing.String() == ipNet.String() {
			*whitelist = append((*whitelist)[:i], (*whitelist)[i+1:]...)
			return nil
		}
	}

	return fmt.Errorf("IP/CIDR not found in whitelist: %s", ipOrCIDR)
}

// ValidateRequest validates the IP address of an HTTP request
func (ipv *IPWhitelistValidator) ValidateRequest(r *http.Request, apiKeyWhitelist []net.IP) error {
	clientIP, err := ipv.GetClientIP(r)
	if err != nil {
		return fmt.Errorf("failed to get client IP: %w", err)
	}

	return ipv.ValidateIP(clientIP, apiKeyWhitelist)
}

// ValidateIP validates an IP address against whitelists
func (ipv *IPWhitelistValidator) ValidateIP(ip net.IP, apiKeyWhitelist []net.IP) error {
	// Check if IP is allowed by special rules
	if ipv.isSpecialIPAllowed(ip) {
		return nil
	}

	// Check global whitelist
	if ipv.isIPInWhitelist(ip, ipv.GlobalWhitelist) {
		return nil
	}

	// Check API key specific whitelist
	if len(apiKeyWhitelist) > 0 {
		for _, allowedIP := range apiKeyWhitelist {
			if ip.Equal(allowedIP) {
				return nil
			}
		}
		return fmt.Errorf("IP address %s is not in API key whitelist", ip.String())
	}

	// If no specific whitelist and not in global whitelist
	if len(ipv.GlobalWhitelist) > 0 {
		return fmt.Errorf("IP address %s is not in global whitelist", ip.String())
	}

	// No whitelists configured, allow all
	return nil
}

// GetClientIP extracts the real client IP from the request
func (ipv *IPWhitelistValidator) GetClientIP(r *http.Request) (net.IP, error) {
	// Try trusted proxy headers first
	for _, header := range ipv.TrustedProxyHeaders {
		if value := r.Header.Get(header); value != "" {
			// Handle comma-separated IPs (take the first one)
			ips := strings.Split(value, ",")
			for _, ipStr := range ips {
				ipStr = strings.TrimSpace(ipStr)
				if ip := net.ParseIP(ipStr); ip != nil {
					// Skip private IPs in proxy headers if we don't trust them
					if !ipv.AllowPrivateIPs && ipv.isPrivateIP(ip) {
						continue
					}
					return ip, nil
				}
			}
		}
	}

	// Fall back to RemoteAddr
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		// RemoteAddr might not have port
		host = r.RemoteAddr
	}

	ip := net.ParseIP(host)
	if ip == nil {
		return nil, fmt.Errorf("unable to parse IP from RemoteAddr: %s", r.RemoteAddr)
	}

	return ip, nil
}

// isSpecialIPAllowed checks if special IPs (localhost, private ranges) are allowed
func (ipv *IPWhitelistValidator) isSpecialIPAllowed(ip net.IP) bool {
	// Check localhost
	if ipv.AllowLocalhost && (ip.IsLoopback() || ip.Equal(net.IPv4(127, 0, 0, 1)) || ip.Equal(net.IPv6loopback)) {
		return true
	}

	// Check private IP ranges
	if ipv.AllowPrivateIPs && ipv.isPrivateIP(ip) {
		return true
	}

	return false
}

// isPrivateIP checks if an IP is in private ranges
func (ipv *IPWhitelistValidator) isPrivateIP(ip net.IP) bool {
	privateRanges := []string{
		"10.0.0.0/8",     // RFC 1918
		"172.16.0.0/12",  // RFC 1918
		"192.168.0.0/16", // RFC 1918
		"169.254.0.0/16", // RFC 3927 (link-local)
		"fc00::/7",       // RFC 4193 (IPv6 unique local)
		"fe80::/10",      // RFC 4291 (IPv6 link-local)
	}

	for _, rangeStr := range privateRanges {
		_, network, err := net.ParseCIDR(rangeStr)
		if err != nil {
			continue
		}
		if network.Contains(ip) {
			return true
		}
	}

	return false
}

// isIPInWhitelist checks if an IP is in a whitelist of CIDR ranges
func (ipv *IPWhitelistValidator) isIPInWhitelist(ip net.IP, whitelist []net.IPNet) bool {
	for _, network := range whitelist {
		if network.Contains(ip) {
			return true
		}
	}
	return false
}

// IsIPAllowed checks if an IP is allowed (without returning detailed error)
func (ipv *IPWhitelistValidator) IsIPAllowed(ip net.IP, apiKeyWhitelist []net.IP) bool {
	return ipv.ValidateIP(ip, apiKeyWhitelist) == nil
}

// GetWhitelistInfo returns information about current whitelists
type WhitelistInfo struct {
	GlobalWhitelist     []string `json:"global_whitelist"`
	AllowLocalhost      bool     `json:"allow_localhost"`
	AllowPrivateIPs     bool     `json:"allow_private_ips"`
	TrustedProxyHeaders []string `json:"trusted_proxy_headers"`
}

// GetWhitelistInfo returns current whitelist configuration
func (ipv *IPWhitelistValidator) GetWhitelistInfo() WhitelistInfo {
	globalWhitelist := make([]string, len(ipv.GlobalWhitelist))
	for i, network := range ipv.GlobalWhitelist {
		globalWhitelist[i] = network.String()
	}

	return WhitelistInfo{
		GlobalWhitelist:     globalWhitelist,
		AllowLocalhost:      ipv.AllowLocalhost,
		AllowPrivateIPs:     ipv.AllowPrivateIPs,
		TrustedProxyHeaders: ipv.TrustedProxyHeaders,
	}
}

// SetTrustedProxyHeaders sets the list of trusted proxy headers
func (ipv *IPWhitelistValidator) SetTrustedProxyHeaders(headers []string) {
	ipv.TrustedProxyHeaders = headers
}

// AddTrustedProxyHeader adds a trusted proxy header
func (ipv *IPWhitelistValidator) AddTrustedProxyHeader(header string) {
	for _, existing := range ipv.TrustedProxyHeaders {
		if existing == header {
			return // Already exists
		}
	}
	ipv.TrustedProxyHeaders = append(ipv.TrustedProxyHeaders, header)
}

// ValidateIPString validates an IP string against whitelists
func (ipv *IPWhitelistValidator) ValidateIPString(ipStr string, apiKeyWhitelist []net.IP) error {
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return fmt.Errorf("invalid IP address: %s", ipStr)
	}

	return ipv.ValidateIP(ip, apiKeyWhitelist)
}

// ClearGlobalWhitelist clears all entries from the global whitelist
func (ipv *IPWhitelistValidator) ClearGlobalWhitelist() {
	ipv.GlobalWhitelist = []net.IPNet{}
}

// GetGlobalWhitelistCount returns the number of entries in the global whitelist
func (ipv *IPWhitelistValidator) GetGlobalWhitelistCount() int {
	return len(ipv.GlobalWhitelist)
}

// AnalyzeIP provides detailed analysis of an IP address
type IPAnalysis struct {
	IP                string   `json:"ip"`
	IsValid           bool     `json:"is_valid"`
	IsIPv4            bool     `json:"is_ipv4"`
	IsIPv6            bool     `json:"is_ipv6"`
	IsLoopback        bool     `json:"is_loopback"`
	IsPrivate         bool     `json:"is_private"`
	IsGloballyAllowed bool     `json:"is_globally_allowed"`
	InGlobalWhitelist bool     `json:"in_global_whitelist"`
	MatchingCIDRs     []string `json:"matching_cidrs"`
	ReasonAllowed     string   `json:"reason_allowed,omitempty"`
	ReasonDenied      string   `json:"reason_denied,omitempty"`
}

// AnalyzeIP provides detailed analysis of an IP address
func (ipv *IPWhitelistValidator) AnalyzeIP(ipStr string, apiKeyWhitelist []net.IP) IPAnalysis {
	analysis := IPAnalysis{
		IP:            ipStr,
		MatchingCIDRs: []string{},
	}

	ip := net.ParseIP(ipStr)
	if ip == nil {
		analysis.ReasonDenied = "Invalid IP address format"
		return analysis
	}

	analysis.IsValid = true
	analysis.IsIPv4 = ip.To4() != nil
	analysis.IsIPv6 = !analysis.IsIPv4
	analysis.IsLoopback = ip.IsLoopback()
	analysis.IsPrivate = ipv.isPrivateIP(ip)

	// Check what CIDRs match
	for _, network := range ipv.GlobalWhitelist {
		if network.Contains(ip) {
			analysis.MatchingCIDRs = append(analysis.MatchingCIDRs, network.String())
		}
	}
	analysis.InGlobalWhitelist = len(analysis.MatchingCIDRs) > 0

	// Check if allowed and why
	if err := ipv.ValidateIP(ip, apiKeyWhitelist); err != nil {
		analysis.ReasonDenied = err.Error()
	} else {
		analysis.IsGloballyAllowed = true
		if analysis.IsLoopback && ipv.AllowLocalhost {
			analysis.ReasonAllowed = "Localhost IP and localhost is allowed"
		} else if analysis.IsPrivate && ipv.AllowPrivateIPs {
			analysis.ReasonAllowed = "Private IP and private IPs are allowed"
		} else if analysis.InGlobalWhitelist {
			analysis.ReasonAllowed = "IP is in global whitelist"
		} else if len(apiKeyWhitelist) > 0 {
			for _, allowedIP := range apiKeyWhitelist {
				if ip.Equal(allowedIP) {
					analysis.ReasonAllowed = "IP is in API key whitelist"
					break
				}
			}
		} else {
			analysis.ReasonAllowed = "No restrictions configured"
		}
	}

	return analysis
}
