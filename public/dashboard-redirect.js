// Redirect to AI Dashboard if user has paid access
document.addEventListener('DOMContentLoaded', async function() {
  try {
    const response = await fetch('/api/user/info')
    if (response.ok) {
      const userData = await response.json()
      
      // If user has paid access, redirect to AI dashboard
      if (userData.type === 'pay') {
        window.location.href = '/dashboard'
      }
    }
  } catch (error) {
    console.error('Failed to check user status:', error)
  }
})
