import { GoogleGenerativeAI } from '@google/generative-ai';
import { createSystemPrompt } from '../data/marsFacts';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function getChatResponse(userMessage: string, planetInfo: {
  planetName: string;
  avgTemp: string;
  planetColor: string;
  oceanCoverage: string;
  gravity: string;
  name: string;
  isResearcher?: boolean;
  correctFacts?: string[];
}): Promise<string> {
  try {
    console.log('🤖 Gemini: Sending message:', userMessage);
    console.log('🌍 Planet context:', planetInfo.planetName);
    console.log('🔬 Is researcher:', planetInfo.isResearcher);
    
    // Use gemini-2.5-flash which may have different rate limits
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
    });
    
    const systemPrompt = createSystemPrompt(planetInfo);
    const prompt = `${systemPrompt}\n\nUser: ${userMessage}\nAssistant:`;
    
    console.log('📋 System prompt being used:', systemPrompt.substring(0, 200) + '...');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    console.log('✅ Gemini response:', responseText);
    
    return responseText;
  } catch (error) {
    console.error('❌ Gemini error:', error);
    throw new Error('Failed to get response from AI');
  }
}
