import jenkins.model.Jenkins
import hudson.security.HudsonPrivateSecurityRealm
import hudson.security.FullControlOnceLoggedInAuthorizationStrategy

final Jenkins j = Jenkins.get()
final String user = System.getenv('JENKINS_ADMIN_ID') ?: 'admin'
final String pass = System.getenv('JENKINS_ADMIN_PASSWORD') ?: 'admin'

def realm = new HudsonPrivateSecurityRealm(false)
if (!realm.getAllUsers().any { it.id == user }) {
  realm.createAccount(user, pass)
}
j.setSecurityRealm(realm)

def strategy = new FullControlOnceLoggedInAuthorizationStrategy()
strategy.setAllowAnonymousRead(false)
j.setAuthorizationStrategy(strategy)

j.save()

