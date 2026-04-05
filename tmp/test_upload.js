async function testUpload() {
  try {
    const formData = new FormData();
    // In Node 18, we can use Blob
    formData.append('file', new Blob(['test file content'], { type: 'application/pdf' }), 'test.pdf');
    formData.append('monthYear', '2026-04');
    formData.append('uploadedBy', 'test-user');

    console.log('Sending request to http://localhost:3000/api/upload');
    
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const text = await response.text();
    console.log(`Status: ${response.status}`);
    console.log('Response:', text);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testUpload();
