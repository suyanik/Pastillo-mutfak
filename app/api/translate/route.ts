import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Gemini AI'ı başlat
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(request: Request) {
  try {
    const { productName, inputLang } = await request.json();

    if (!productName || !inputLang) {
      return NextResponse.json(
        { error: "productName ve inputLang gerekli" },
        { status: 400 }
      );
    }

    // Gemini'ye çeviri prompt'u gönder
    const prompt = `Sen bir profesyonel mutfak çevirmenisisin. Aşağıdaki yiyecek/mutfak ürününü 3 dile çevir.

Ürün adı: "${productName}"
Girilen dil: ${inputLang === 'tr' ? 'Türkçe' : inputLang === 'de' ? 'Almanca' : 'Pencapça (Punjabi)'}

Lütfen bu ürünü şu dillere çevir:
1. Türkçe (tr)
2. Almanca (de)
3. Pencapça/Punjabi (pa) - Latin alfabesi ile yaz

SADECE JSON formatında cevap ver, başka açıklama ekleme:
{
  "tr": "Türkçe çeviri",
  "de": "Almanca çeviri",
  "pa": "Pencapça çeviri (Latin harfleriyle)"
}

ÖNEMLİ: Sadece ürün adını çevir, miktar veya birim ekleme. Eğer zaten doğru dilde yazılmışsa aynısını kullan.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // JSON'u temizle ve parse et (Gemini bazen ```json``` ile sarabilir)
    const cleanedText = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const translations = JSON.parse(cleanedText);

    return NextResponse.json({
      success: true,
      translations: {
        tr: translations.tr || productName,
        de: translations.de || productName,
        pa: translations.pa || productName,
      },
    });
  } catch (error: any) {
    console.error("Çeviri hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Çeviri sırasında hata oluştu",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
