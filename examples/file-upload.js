import EasyLLM from '../dist/index.js';
import fs from 'fs';
import path from 'path';

// Initialize the client
const client = new EasyLLM({
  apiKey: process.env.EASYLLM_API_KEY || 'your-api-key-here',
});

async function basicFileUpload() {
  console.log('=== Basic File Upload ===');
  
  const files = [
    {
      fileName: 'hello.py',
      content: 'print("Hello, world!")\nprint("This is a simple Python script")'
    }
  ];

  try {
    const response = await client.chat.completions.createWithFiles({
      model: 'llama4-scout',
      messages: [
        { role: 'user', content: 'What does this Python script do?' }
      ]
    }, files);

    console.log('Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function multipleFileUpload() {
  console.log('\n=== Multiple File Upload ===');
  
  const files = [
    {
      fileName: 'config.json',
      content: JSON.stringify({
        "database": {
          "host": "localhost",
          "port": 5432,
          "name": "myapp"
        },
        "api": {
          "key": "secret-key",
          "debug": true
        }
      }, null, 2)
    },
    {
      fileName: 'app.py',
      content: `import json
import os

def load_config():
    with open('config.json', 'r') as f:
        config = json.load(f)
    return config

def connect_database(config):
    host = config['database']['host']
    port = config['database']['port'] 
    name = config['database']['name']
    # Database connection logic here
    return f"Connected to {name} at {host}:{port}"

if __name__ == "__main__":
    config = load_config()
    print(connect_database(config))`
    }
  ];

  try {
    const response = await client.chat.completions.createWithFiles({
      model: 'llama4-scout',
      messages: [
        { role: 'user', content: 'Review this code for potential security vulnerabilities and suggest improvements.' }
      ]
    }, files);

    console.log('Security Review:', response.choices[0].message.content);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function fileValidationExample() {
  console.log('\n=== File Validation Example ===');
  
  const files = [
    {
      fileName: 'script.py',
      content: 'print("Valid Python file")'
    }
  ];

  const options = {
    maxFileSize: 1024, // 1KB limit
    allowedExtensions: ['py', 'js', 'ts', 'txt']
  };

  try {
    const response = await client.chat.completions.createWithFiles({
      model: 'llama4-scout',
      messages: [
        { role: 'user', content: 'Explain what this code does' }
      ]
    }, files, options);

    console.log('Analysis:', response.choices[0].message.content);
  } catch (error) {
    console.error('Validation Error:', error.message);
  }
}

async function streamingFileUpload() {
  console.log('\n=== Streaming File Upload ===');
  
  const files = [
    {
      fileName: 'data.csv',
      content: `name,age,city,salary
John Doe,30,New York,75000
Jane Smith,25,San Francisco,85000
Bob Johnson,35,Chicago,65000
Alice Brown,28,Boston,70000
Charlie Wilson,32,Seattle,80000`
    }
  ];

  try {
    const stream = await client.chat.completions.streamWithFiles({
      model: 'llama4-scout',
      messages: [
        { role: 'user', content: 'Analyze this employee data and provide insights about salary trends by city and age.' }
      ]
    }, files);

    console.log('Streaming Analysis:');
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      process.stdout.write(content);
    }
    console.log('\n');
  } catch (error) {
    console.error('Streaming Error:', error.message);
  }
}

async function readFromFileSystem() {
  console.log('\n=== Reading from File System ===');
  
  // Create a temporary file for demonstration
  const tempFilePath = path.join(process.cwd(), 'temp-example.js');
  const tempFileContent = `// Example JavaScript file
function calculateArea(radius) {
  return Math.PI * radius * radius;
}

function calculateCircumference(radius) {
  return 2 * Math.PI * radius;
}

// Usage example
const radius = 5;
console.log(\`Area: \${calculateArea(radius)}\`);
console.log(\`Circumference: \${calculateCircumference(radius)}\`);
`;

  try {
    // Write temporary file
    fs.writeFileSync(tempFilePath, tempFileContent);
    
    // Read file content using Buffer
    const buffer = fs.readFileSync(tempFilePath);
    const fileFromBuffer = await EasyLLM.readFileContent(buffer, 'example.js');
    
    // Use in chat completion
    const response = await client.chat.completions.createWithFiles({
      model: 'llama4-scout',
      messages: [
        { role: 'user', content: 'Explain this JavaScript code and suggest any improvements.' }
      ]
    }, [fileFromBuffer]);

    console.log('Code Review:', response.choices[0].message.content);
    
    // Clean up
    fs.unlinkSync(tempFilePath);
  } catch (error) {
    console.error('File System Error:', error.message);
    // Clean up on error
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

async function manualFileMessages() {
  console.log('\n=== Manual File Messages ===');
  
  // Create file messages manually using the files utility
  const fileMessages = client.files.createMessages([
    { fileName: 'utils.js', content: 'export const add = (a, b) => a + b;' },
    { fileName: 'main.js', content: 'import { add } from "./utils.js";\nconsole.log(add(2, 3));' }
  ]);

  try {
    const response = await client.chat.completions.create({
      model: 'llama4-scout',
      messages: [
        ...fileMessages,
        { role: 'user', content: 'Explain how these JavaScript modules work together.' }
      ]
    });

    console.log('Module Analysis:', response.choices[0].message.content);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run all examples
async function runAllExamples() {
  console.log('EasyLLM File Upload Examples\n');
  
  await basicFileUpload();
  await multipleFileUpload();
  await fileValidationExample();
  await streamingFileUpload();
  await readFromFileSystem();
  await manualFileMessages();
  
  console.log('\n=== All examples completed! ===');
}

// Check if API key is set
if (!process.env.EASYLLM_API_KEY) {
  console.log('Please set your EASYLLM_API_KEY environment variable to run these examples.');
  console.log('Example: export EASYLLM_API_KEY="your-api-key-here"');
  process.exit(1);
}

runAllExamples().catch(console.error);