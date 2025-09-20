import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込み
const result = dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
console.log('Dotenv result:', result.error ? 'Error' : 'Success');
if (result.parsed) {
  console.log('Parsed keys:', Object.keys(result.parsed));
}

const testGuardianAPI = async () => {
  console.log('\nEnvironment variables check:');
  console.log('GUARDIAN_API_KEY from env:', process.env.GUARDIAN_API_KEY);
  console.log('Full value:', process.env.GUARDIAN_API_KEY);
  
  // 正しいAPIキーを直接使用してテスト
  const apiKey = '7462aa81-2caa-4df5-830b-b043cf39948d';
  
  console.log('✅ Using API Key:', apiKey.substring(0, 8) + '...');
  
  // シンプルなAPIテスト
  const testUrl = `https://content.guardianapis.com/search?api-key=${apiKey}&page-size=1`;
  
  console.log('\n📡 Testing Guardian API connection...');
  console.log('URL:', testUrl.replace(apiKey, 'xxx'));
  
  try {
    const response = await fetch(testUrl);
    const data = await response.json();
    
    console.log('\n📊 Response Status:', response.status);
    console.log('Response OK:', response.ok);
    
    if (response.ok) {
      console.log('\n✅ API Connection successful!');
      console.log('Total results:', data.response?.total || 0);
      console.log('Current page:', data.response?.currentPage || 0);
      console.log('Pages:', data.response?.pages || 0);
      
      if (data.response?.results?.length > 0) {
        const firstItem = data.response.results[0];
        console.log('\n📰 Sample article:');
        console.log('  Title:', firstItem.webTitle);
        console.log('  Section:', firstItem.sectionName);
        console.log('  URL:', firstItem.webUrl);
      }
    } else {
      console.error('\n❌ API Error:', data.message || 'Unknown error');
      console.error('Full response:', JSON.stringify(data, null, 2));
    }
    
    // 日付範囲を指定したテスト
    console.log('\n📅 Testing with date range...');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const fromDate = yesterday.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];
    
    const dateTestUrl = `https://content.guardianapis.com/search?api-key=${apiKey}&from-date=${fromDate}&to-date=${toDate}&page-size=5`;
    
    const dateResponse = await fetch(dateTestUrl);
    const dateData = await dateResponse.json();
    
    if (dateResponse.ok) {
      console.log(`✅ Found ${dateData.response?.total || 0} articles from ${fromDate} to ${toDate}`);
      if (dateData.response?.results) {
        console.log(`Retrieved ${dateData.response.results.length} articles in this page`);
      }
    } else {
      console.error('❌ Date range test failed:', dateData.message);
    }
    
  } catch (error) {
    console.error('\n❌ Network error:', error);
  }
};

testGuardianAPI();