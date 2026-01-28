import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// 🚀 SİHİRLİ SATIR: Bu kodu "Edge Network" üzerinde çalıştırır (Daha hızlıdır, bekleme yapmaz)
export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { productName, inputLang } = await request.json();

    // 1. API Anahtarını al
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key eksik" }, { status: 500 });
    }

    // 2. EN HIZLI MODELİ SEÇ (gemini-1.5-flash)
    // 'pro' modelleri yavaştır, 'flash' modelleri milisaniyede cevap verir.
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 3. Kesin ve Kısa Prompt
    const prompt = `
      You are a translation engine for a kitchen inventory system.
      Input: "${productName}" (Language: ${inputLang})
      Task: Translate accurately to Turkish (tr), German (de), and Punjabi (pa).
      Format: JSON only. No markdown, no explanations.
      Example Output: { "tr": "Soğan", "de": "Zwiebel", "pa": "ਪਿਆਜ਼" }
    `;

    // 4. Cevabı al
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Temizlik (Bazen AI ```json ... ``` ekler, onu siliyoruz)
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const json = JSON.parse(text);

    return NextResponse.json(json);

  } catch (error) {
    console.error("API Hatası:", error);
    // Hata olsa bile sistemi durdurma, orijinal ismi geri dön
    return NextResponse.json({
      tr: "...",
      de: "...",
      pa: "..."
    });
  }
}