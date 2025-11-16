package services

import (
  "encoding/json"
  "fmt"
  "net/http"
  "os"
  "time"
)

type FigmaService struct {
  httpClient *http.Client
  apiBase    string
  token      string
}

func NewFigmaService() *FigmaService {
  return &FigmaService{
    httpClient: &http.Client{Timeout: 20 * time.Second},
    apiBase:    "https://api.figma.com/v1",
    token:      os.Getenv("FIGMA_API_TOKEN"),
  }
}

func (s *FigmaService) IsConfigured() bool {
  return s.token != ""
}

func (s *FigmaService) getJSON(path string) (map[string]interface{}, int, error) {
  url := fmt.Sprintf("%s%s", s.apiBase, path)
  req, err := http.NewRequest("GET", url, nil)
  if err != nil {
    return nil, 0, err
  }
  req.Header.Set("Authorization", "Bearer "+s.token)
  resp, err := s.httpClient.Do(req)
  if err != nil {
    return nil, 0, err
  }
  defer resp.Body.Close()
  var out map[string]interface{}
  if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
    return nil, resp.StatusCode, err
  }
  return out, resp.StatusCode, nil
}

func (s *FigmaService) GetFile(fileKey string) (map[string]interface{}, int, error) {
  return s.getJSON(fmt.Sprintf("/files/%s", fileKey))
}

func (s *FigmaService) GetFileComponents(fileKey string) (map[string]interface{}, int, error) {
  return s.getJSON(fmt.Sprintf("/files/%s/components", fileKey))
}

func (s *FigmaService) GetFileStyles(fileKey string) (map[string]interface{}, int, error) {
  return s.getJSON(fmt.Sprintf("/files/%s/styles", fileKey))
}

func (s *FigmaService) GetFileVariables(fileKey string) (map[string]interface{}, int, error) {
  return s.getJSON(fmt.Sprintf("/files/%s/variables", fileKey))
}

