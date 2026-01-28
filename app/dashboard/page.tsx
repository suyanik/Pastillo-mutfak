"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  updateDoc, doc, serverTimestamp
} from "firebase/firestore";
import { Trash2, Check, ChefHat, UserCircle, FileText, Archive } from "lucide-react";
import Link from "next/link";

// --- DİL VE ÇEVİRİ AYARLARI ---
type LangCode = "tr" | "de" | "pa";

const DICTIONARY = {
  tr: {
    title: "Pastillo Mutfak",
    reports: "Raporlar",
    placeholder: "Ürün adı... (Örn: Domates)",
    loading: "Yükleniyor...",
    empty: "Liste boş. Mutfakta her şey tamam mı?",
    who_ask: "Kim istiyor?",
    role_chef: "Şef",
    role_bar: "Bar",
    role_kitchen: "Mutfak",
    unit_kg: "Kg",
    unit_pcs: "Adet",
    unit_box: "Kasa",
    unit_pack: "Paket",
    unit_bag: "Çuval",
    cat_metro: "Metro",
    cat_veg: "Sebze",
    cat_meat: "Kasap",
    cat_drink: "İçecek",
    cat_other: "Diğer",
  },
  de: {
    title: "Pastillo Küche",
    reports: "Berichte",
    placeholder: "Produktname... (z.B. Tomaten)",
    loading: "Laden...",
    empty: "Liste ist leer. Alles da?",
    who_ask: "Wer bestellt?",
    role_chef: "Chef",
    role_bar: "Bar",
    role_kitchen: "Küche",
    unit_kg: "Kg",
    unit_pcs: "Stück",
    unit_box: "Kiste",
    unit_pack: "Packung",
    unit_bag: "Sack",
    cat_metro: "Metro",
    cat_veg: "Gemüse",
    cat_meat: "Fleisch",
    cat_drink: "Getränke",
    cat_other: "Andere",
  },
  pa: {
    title: "ਪਾਸਟਿਲੋ ਰਸੋਈ",
    reports: "ਰਿਪੋਰਟਾਂ",
    placeholder: "ਉਤਪਾਦ ਦਾ ਨਾਮ...",
    loading: "ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...",
    empty: "ਸੂਚੀ ਖਾਲੀ ਹੈ। ਸਭ ਕੁਝ ਠੀਕ ਹੈ?",
    who_ask: "ਕੌਣ ਮੰਗ ਰਿਹਾ ਹੈ?",
    role_chef: "ਸ਼ੈੱਫ",
    role_bar: "ਬਾਰ",
    role_kitchen: "ਰਸੋਈ",
    unit_kg: "ਕਿਲੋ",
    unit_pcs: "ਟੁਕੜਾ",
    unit_box: "ਬਾਕਸ",
    unit_pack: "ਪੈਕਟ",
    unit_bag: "ਬੋਰੀ",
    cat_metro: "ਮੈਟਰੋ",
    cat_veg: "ਸਬਜ਼ੀ",
    cat_meat: "ਮੀਟ",
    cat_drink: "ਪੀਣ ਵਾਲੇ",
    cat_other: "ਹੋਰ",
  }
};

export default function Dashboard() {
  const [lang, setLang] = useState<LangCode>("tr");
  const t = DICTIONARY[lang];

  // Form State
  const [newItem, setNewItem] = useState("");
  const [category, setCategory] = useState("veg");
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState("kg");
  const [requester, setRequester] = useState("chef");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data State
  const [items, setItems] = useState<any[]>([]); // TÜM ÜRÜNLER (Arşiv dahil)
  const [loading, setLoading] = useState(true);

  // Firestore Dinleme (Tüm ürünler - arşiv dahil)
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 1. GÖRÜNECEK LİSTE (Sadece Arşivlenmemişler)
  const visibleItems = useMemo(() =>
    items.filter(item => !item.isArchived),
    [items]
  );

  // 2. ÖNERİ LİSTESİ (Tüm geçmiş ürünlerden benzersiz isimler)
  const suggestions = useMemo(() => {
    const names = new Set<string>();
    items.forEach(item => {
        if(item.originalName) names.add(item.originalName);
        if(item.names?.[lang]) names.add(item.names[lang]);
    });
    return Array.from(names).slice(0, 20); // İlk 20 öneri
  }, [items, lang]);

  // Hızlı Ekleme Fonksiyonu
  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim() || isSubmitting) return;

    setIsSubmitting(true);

    const itemToAdd = newItem;
    const currentData = {
        lang,
        cat: category,
        amt: amount,
        unit: unit,
        req: requester
    };

    setNewItem(""); // Formu hemen temizle

    try {
      // Veritabanına Ekle
      const docRef = await addDoc(collection(db, "products"), {
        originalName: itemToAdd,
        inputLang: currentData.lang,
        names: { tr: itemToAdd, de: itemToAdd, pa: itemToAdd },
        category: currentData.cat,
        amount: currentData.amt,
        unit: currentData.unit,
        requester: currentData.req,
        isBought: false,
        isArchived: false, // Yeni ürünler arşivli değil
        createdAt: serverTimestamp(),
        boughtAt: null,
        isTranslating: true
      });

      setIsSubmitting(false);

      // Arka Planda Çeviri
      fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productName: itemToAdd, inputLang: currentData.lang })
      })
      .then(res => res.json())
      .then(data => {
          if (data.success) {
            updateDoc(doc(db, "products", docRef.id), {
                names: data.translations,
                isTranslating: false
            });
          }
      })
      .catch(err => {
        console.error("Çeviri hatası:", err);
        updateDoc(doc(db, "products", docRef.id), {
            isTranslating: false
        });
      });

    } catch (error) {
      console.error("Hata:", error);
      setIsSubmitting(false);
      alert("Bir hata oldu, interneti kontrol et.");
    }
  };

  // İŞLEM: Satın Alındı İşaretle
  const toggleItem = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, "products", id), {
      isBought: !currentStatus,
      boughtAt: !currentStatus ? serverTimestamp() : null
    });
  };

  // İŞLEM: Arşivle (Silme Yerine)
  const archiveItem = async (id: string) => {
    // Veriyi silmiyoruz, sadece 'isArchived: true' yapıp ekrandan gizliyoruz
    await updateDoc(doc(db, "products", id), {
      isArchived: true,
      archivedAt: serverTimestamp()
    });
  };

  return (
    <div className={`min-h-screen bg-gray-50 p-4 ${lang === 'pa' ? 'font-gurmukhi' : ''}`}>
      <div className="max-w-xl mx-auto space-y-6">

        {/* ÜST BAR */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ChefHat className="text-orange-600" />
            {t.title}
          </h1>

          <div className="flex items-center gap-3">
            {/* Raporlar Butonu */}
            <Link href="/reports">
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                <FileText className="w-4 h-4" />
                {t.reports}
              </button>
            </Link>

            {/* Dil Seçici */}
            <div className="flex gap-2 bg-gray-800 rounded-lg p-1 border border-gray-700">
            {(["tr", "de", "pa"] as LangCode[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-4 py-2 rounded-md font-bold transition-all ${
                  lang === l
                    ? "bg-orange-600 text-white shadow-lg scale-105"
                    : "bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          </div>
        </div>

        {/* EKLEME FORMU */}
        <div className="bg-white p-5 rounded-xl shadow-lg border-t-4 border-orange-500">
          <form onSubmit={addItem} className="space-y-4">

            {/* Personel Seçimi */}
            <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg">
                <UserCircle className="text-blue-500" />
                <span className="text-sm font-bold text-blue-700">{t.who_ask}:</span>
                <div className="flex gap-2">
                    {['chef', 'bar', 'kitchen'].map((role) => (
                        <button
                            key={role}
                            type="button"
                            onClick={() => setRequester(role)}
                            className={`px-3 py-1 rounded-md text-sm ${requester === role ? 'bg-blue-500 text-white shadow' : 'bg-white text-gray-600 border'}`}
                        >
                            {t[`role_${role}` as keyof typeof t]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Kategori Seçimi */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {[
                { id: "metro", icon: "🛒" },
                { id: "veg", icon: "🥦" },
                { id: "meat", icon: "🥩" },
                { id: "drink", icon: "🥤" },
                { id: "other", icon: "⚡" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                    category === cat.id ? "bg-orange-600 text-white scale-105" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span className="capitalize">{t[`cat_${cat.id}` as keyof typeof t]}</span>
                </button>
              ))}
            </div>

            {/* Ürün Adı Input (Autocomplete ile) */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder={t.placeholder}
                list="product-suggestions"
                disabled={isSubmitting}
                className="flex-1 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg text-black disabled:opacity-50"
              />
              {/* Datalist ile öneri sistemi */}
              <datalist id="product-suggestions">
                {suggestions.map((suggestion, idx) => (
                  <option key={idx} value={suggestion} />
                ))}
              </datalist>
            </div>

            {/* Miktar ve Birim */}
            <div className="flex gap-2">
               <input
                 type="number"
                 value={amount}
                 onChange={(e) => setAmount(e.target.value)}
                 disabled={isSubmitting}
                 className="w-20 p-3 bg-gray-50 border rounded-xl text-center font-bold text-black disabled:opacity-50"
                 min="1"
               />
               <select
                 value={unit}
                 onChange={(e) => setUnit(e.target.value)}
                 disabled={isSubmitting}
                 className="flex-1 p-3 bg-gray-50 border rounded-xl text-black disabled:opacity-50"
               >
                 {['kg', 'pcs', 'box', 'pack', 'bag'].map(u =>
                   <option key={u} value={u}>{t[`unit_${u}` as keyof typeof t]}</option>
                 )}
               </select>
               <button
                 type="submit"
                 disabled={isSubmitting || !newItem.trim()}
                 className="bg-green-600 text-white px-6 rounded-xl font-bold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
               >
                 {isSubmitting ? (
                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                 ) : (
                   "+"
                 )}
               </button>
            </div>
          </form>
        </div>

        {/* ÜRÜN LİSTESİ */}
        <div className="space-y-3 pb-10">
          {loading ? (
            <div className="text-center text-gray-400 py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              {t.loading}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <ChefHat className="w-16 h-16 mx-auto mb-4 opacity-50" />
              {t.empty}
            </div>
          ) : (
            visibleItems.map((item) => (
              <div
                key={item.id}
                className={`group flex items-center justify-between p-4 rounded-xl border transition-all ${
                  item.isBought ? "bg-gray-100 border-gray-200 opacity-60" : "bg-white border-gray-200 shadow-sm"
                }`}
              >
                {/* Checkbox */}
                <div onClick={() => toggleItem(item.id, item.isBought)} className="flex items-center gap-4 flex-1 cursor-pointer">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    item.isBought ? "bg-green-500 border-green-500" : "border-gray-300 group-hover:border-orange-500"
                  }`}>
                    {item.isBought && <Check className="w-4 h-4 text-white" />}
                  </div>

                  {/* Ürün Bilgisi */}
                  <div>
                    <h3 className={`text-lg font-medium ${item.isBought ? "line-through text-gray-500" : "text-gray-900"}`}>
                      {item.names?.[lang] || item.originalName}
                      {/* Çeviriliyor göstergesi */}
                      {item.isTranslating && <span className="text-xs text-orange-500 ml-2 animate-pulse">(Çeviriliyor...)</span>}
                    </h3>
                    <p className="text-xs text-gray-400 flex gap-2 items-center mt-1">
                       <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold uppercase text-[10px]">
                         {t[`role_${item.requester || 'chef'}` as keyof typeof t]}
                       </span>
                       <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-bold">
                         {item.amount} {t[`unit_${item.unit}` as keyof typeof t]}
                       </span>
                       <span className="uppercase tracking-wider">{t[`cat_${item.category}` as keyof typeof t]}</span>
                    </p>
                  </div>
                </div>

                {/* Arşivle Butonu */}
                <button
                  onClick={() => archiveItem(item.id)}
                  className="p-2 text-gray-300 hover:text-orange-500 transition-colors"
                  title="Arşivle"
                >
                  <Archive className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
