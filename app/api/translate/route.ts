import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// 🚀 SİHİRLİ SATIR: Bu kodu "Edge Network" üzerinde çalıştırır (Daha hızlıdır, bekleme yapmaz)
export const runtime = 'edge';

// Firebase Bağlantısı (Önbellek için)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export async function POST(request: Request) {
  try {
    const { productName, inputLang } = await request.json();

    // 🎯 1. ÖNBELLEĞİ KONTROL ET (95% HIZ KAZANCI!)
    const cacheKey = productName.toLowerCase().trim();
    const cacheRef = doc(db, "translationCache", cacheKey);

    try {
      const cacheSnap = await getDoc(cacheRef);
      if (cacheSnap.exists()) {
        // ✅ ÖNBELLEKTE VAR - Anında Döndür! (2-3ms)
        console.log("⚡ Cache HIT:", productName);
        return NextResponse.json(cacheSnap.data());
      }
    } catch (cacheError) {
      console.log("Cache okuma hatası, Gemini'ye devam...");
    }

    // ❌ ÖNBELLEKTE YOK - Gemini'ye Git (2-3 saniye)
    console.log("🔄 Cache MISS:", productName, "- Çevriliyor...");

    // 2. API Anahtarını al
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key eksik" }, { status: 500 });
    }

    // 3. EN HIZLI MODELİ SEÇ (gemini-1.5-flash)
    // 'pro' modelleri yavaştır, 'flash' modelleri milisaniyede cevap verir.
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 4. Kesin ve Kısa Prompt
    const prompt = `
      You are a translation engine for a kitchen inventory system.
      Input: "${productName}" (Language: ${inputLang})
      Task: Translate accurately to Turkish (tr), German (de), and Punjabi (pa).
      Format: JSON only. No markdown, no explanations.
      Example Output: { "tr": "Soğan", "de": "Zwiebel", "pa": "ਪਿਆਜ਼" }
    `;

    // 5. Cevabı al
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Temizlik (Bazen AI ```json ... ``` ekler, onu siliyoruz)
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const json = JSON.parse(text);

    // 💾 6. ÖNBELLEĞE KAYDET (Bir daha hızlı olsun)
    try {
      await setDoc(cacheRef, json);
      console.log("💾 Cache'e kaydedildi:", productName);
    } catch (saveError) {
      console.log("Cache kaydetme hatası (önemli değil):", saveError);
    }

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