// Test script to verify the dashboard is working
console.log('🧪 Testing AI Dashboard...')

// Test 1: Check if models API is working
fetch('/api/models')
  .then(response => response.json())
  .then(data => {
    console.log('✅ Models API:', data.ok ? 'Working' : 'Failed')
    console.log('📊 Models found:', data.models?.length || 0)
  })
  .catch(error => {
    console.error('❌ Models API failed:', error)
  })

// Test 2: Check if placeholder image is accessible
const img = new Image()
img.onload = () => console.log('✅ Placeholder image: Accessible')
img.onerror = () => console.log('❌ Placeholder image: Failed to load')
img.src = '/placeholder-result.svg'

// Test 3: Check if orders API is working
fetch('/api/orders')
  .then(response => response.json())
  .then(data => {
    console.log('✅ Orders API:', data.ok ? 'Working' : 'Failed')
    console.log('📦 Orders found:', data.orders?.length || 0)
  })
  .catch(error => {
    console.error('❌ Orders API failed:', error)
  })

console.log('🎯 Dashboard test completed!')
