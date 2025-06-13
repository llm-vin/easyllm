const { EasyLLM } = require('../dist');

// Initialize the client
const client = new EasyLLM({
  apiKey: process.env.LLM_VIN_API_KEY || 'your-api-key-here',
  provider: 'llm.vin', // or 'openai' for OpenAI's moderation
});

async function basicModerationExample() {
  console.log('🔍 Basic Moderation Example');
  console.log('=' .repeat(50));

  try {
    const result = await client.createModeration({
      input: "I want to hurt someone",
    });

    console.log('Moderation Result:', JSON.stringify(result, null, 2));
    
    const flagged = result.results[0].flagged;
    console.log(`\n✅ Content ${flagged ? 'FLAGGED' : 'SAFE'}`);
    
    if (flagged) {
      const categories = result.results[0].categories;
      const flaggedCategories = Object.entries(categories)
        .filter(([_, value]) => value)
        .map(([key]) => key);
      console.log('🚨 Flagged categories:', flaggedCategories.join(', '));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function batchModerationExample() {
  console.log('\n🔍 Batch Moderation Example');
  console.log('=' .repeat(50));

  try {
    const result = await client.moderations.create({
      input: [
        "Hello, how are you today?",
        "I hate everyone",
        "This is a normal message",
      ],
      model: "moderation-1"
    });

    console.log('Batch Moderation Results:');
    result.results.forEach((moderationResult, index) => {
      console.log(`\nText ${index + 1}: ${moderationResult.flagged ? '🚨 FLAGGED' : '✅ SAFE'}`);
      
      if (moderationResult.flagged) {
        const flaggedCategories = Object.entries(moderationResult.categories)
          .filter(([_, value]) => value)
          .map(([key]) => key);
        console.log(`  Categories: ${flaggedCategories.join(', ')}`);
      }
      
      // Show top scores
      const topScores = Object.entries(moderationResult.category_scores)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);
      console.log(`  Top scores: ${topScores.map(([cat, score]) => `${cat}: ${score.toFixed(3)}`).join(', ')}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function moderationWithImagesExample() {
  console.log('\n🔍 Moderation with Images Example');  
  console.log('=' .repeat(50));

  try {
    // Example with base64 image data
    const result = await client.createModeration({
      input: "Check this image content",
      model: "moderation-1",
      input_images: [
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
      ]
    });

    console.log('Image Moderation Result:', JSON.stringify(result, null, 2));
    
    const flagged = result.results[0].flagged;
    console.log(`\n✅ Content ${flagged ? 'FLAGGED' : 'SAFE'}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function runAllExamples() {
  await basicModerationExample();
  await batchModerationExample();
  await moderationWithImagesExample();
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

module.exports = {
  basicModerationExample,
  batchModerationExample,
  moderationWithImagesExample,
  runAllExamples,
};