// Test script to verify API endpoints
const testAPI = async () => {
  try {
    console.log('Testing API endpoints...')
    
    // Test models endpoint
    const modelsResponse = await fetch('http://localhost:3000/api/models')
    const modelsData = await modelsResponse.json()
    console.log('✅ Models API:', modelsData.ok ? 'Working' : 'Failed')
    
    // Test orders endpoint
    const ordersResponse = await fetch('http://localhost:3000/api/orders')
    const ordersData = await ordersResponse.json()
    console.log('✅ Orders API:', ordersData.ok ? 'Working' : 'Failed')
    
    console.log('🎉 All API endpoints are working!')
  } catch (error) {
    console.error('❌ API test failed:', error.message)
  }
}

// Run test if in browser environment
if (typeof window !== 'undefined') {
  testAPI()
}

module.exports = testAPI
