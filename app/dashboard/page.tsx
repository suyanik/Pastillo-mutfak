"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import { ShoppingBasket, Trash2, Check, ChefHat, Languages } from "lucide-react";

// --- DİL VE ÇEVİRİ AYARLARI ---
type LangCode = "tr" | "de" | "pa";

const DICTIONARY = {
  tr: {
    title: "Pastillo Mutfak",
    add: "Listeye Ekle",
    translating: "Çeviriliyor...",
    placeholder: "Ürün adı... (Örn: Domates)",
    loading: "Yükleniyor...",
    empty: "Liste boş. Mutfakta her şey tamam mı?",
    cat_metro: "Metro",
    cat_veg: "Sebze",
    cat_meat: "Kasap",
    cat_drink: "İçecek",
    cat_other: "Diğer",
    unit_kg: "Kg",
    unit_pcs: "Adet",
    unit_box: "Kasa",
    unit_pack: "Paket",
    unit_bag: "Çuval",
  },
  de: {
    title: "Pastillo Küche",
    add: "Hinzufügen",
    translating: "Übersetzen...",
    placeholder: "Produktname... (z.B. Tomaten)",
    loading: "Laden...",
    empty: "Liste ist leer. Alles da?",
    cat_metro: "Metro",
    cat_veg: "Gemüse",
    cat_meat: "Fleisch",
    cat_drink: "Getränke",
    cat_other: "Andere",
    unit_kg: "Kg",
    unit_pcs: "Stück",
    unit_box: "Kiste",
    unit_pack: "Packung",
    unit_bag: "Sack",
  },
  pa: {
    title: "ਪਾਸਟਿਲੋ ਰਸੋਈ",
    add: "ਸ਼ਾਮਲ ਕਰੋ",
    translating: "ਅਨੁਵਾਦ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ...",
    placeholder: "ਉਤਪਾਦ ਦਾ ਨਾਮ...",
    loading: "ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...",
    empty: "ਸੂਚੀ ਖਾਲੀ ਹੈ। ਸਭ ਕੁਝ ਠੀਕ ਹੈ?",
    cat_metro: "ਮੈਟਰੋ",
    cat_veg: "ਸਬਜ਼ੀ",
    cat_meat: "ਮੀਟ",
    cat_drink: "ਪੀਣ ਵਾਲੇ",
    cat_other: "ਹੋਰ",
    unit_kg: "ਕਿਲੋ",
    unit_pcs: "ਟੁਕੜਾ",
    unit_box: "ਬਾਕਸ",
    unit_pack: "ਪੈਕਟ",
    unit_bag: "ਬੋਰੀ",
  }
};

export default function Dashboard() {
  // Varsayılan Dil: Türkçe
  const [lang, setLang] = useState<LangCode>("tr");
  const t = DICTIONARY[lang];

  // Form State
  const [newItem, setNewItem] = useState("");
  const [category, setCategory] = useState("veg");
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState("kg");

  // Data State
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);

  // Firestore Dinleme
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Ürün Ekleme
  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    try {
      setTranslating(true);

      // Gemini AI ile çeviri yap
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: newItem,
          inputLang: lang
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Çeviri başarısız');
      }

      // Çevirilerle birlikte Firebase'e kaydet
      await addDoc(collection(db, "products"), {
        originalName: newItem,
        inputLang: lang,
        names: data.translations, // AI'dan gelen 3 dil
        category,
        amount,
        unit,
        isBought: false,
        createdAt: serverTimestamp(),
      });

      setNewItem("");
    } catch (error) {
      console.error('Ürün ekleme hatası:', error);
      alert('Ürün eklenirken hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setTranslating(false);
    }
  };

  // Satın Alındı İşaretleme
  const toggleItem = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, "products", id), { isBought: !currentStatus });
  };

  // Silme
  const deleteItem = async (id: string) => {
    if (confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
      await deleteDoc(doc(db, "products", id));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-4 md:p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ChefHat className="w-10 h-10 text-orange-500" />
            <h1 className="text-3xl font-bold">{t.title}</h1>
          </div>

          {/* Dil Seçici */}
          <div className="flex gap-2 bg-gray-800 rounded-lg p-1">
            {(["tr", "de", "pa"] as LangCode[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  lang === l
                    ? "bg-orange-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={addItem} className="bg-gray-800 rounded-xl p-6 shadow-2xl">
          <div className="space-y-4">
            {/* Ürün Adı */}
            <div>
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder={t.placeholder}
                disabled={translating}
                className="w-full bg-gray-900 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-orange-500 outline-none disabled:opacity-50"
              />
            </div>

            {/* Kategori ve Birim */}
            <div className="grid grid-cols-2 gap-4">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={translating}
                className="bg-gray-900 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-orange-500 outline-none disabled:opacity-50"
              >
                <option value="metro">{t.cat_metro}</option>
                <option value="veg">{t.cat_veg}</option>
                <option value="meat">{t.cat_meat}</option>
                <option value="drink">{t.cat_drink}</option>
                <option value="other">{t.cat_other}</option>
              </select>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={translating}
                  className="bg-gray-900 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-orange-500 outline-none disabled:opacity-50"
                  min="1"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  disabled={translating}
                  className="bg-gray-900 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-orange-500 outline-none disabled:opacity-50"
                >
                  <option value="kg">{t.unit_kg}</option>
                  <option value="pcs">{t.unit_pcs}</option>
                  <option value="box">{t.unit_box}</option>
                  <option value="pack">{t.unit_pack}</option>
                  <option value="bag">{t.unit_bag}</option>
                </select>
              </div>
            </div>

            {/* Ekle Butonu */}
            <button
              type="submit"
              disabled={translating || !newItem.trim()}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {translating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {t.translating}
                </>
              ) : (
                <>
                  <ShoppingBasket className="w-5 h-5" />
                  {t.add}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Ürün Listesi */}
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center text-gray-400 py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            {t.loading}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <ShoppingBasket className="w-16 h-16 mx-auto mb-4 opacity-50" />
            {t.empty}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={`bg-gray-800 rounded-lg p-4 flex items-center gap-4 transition-all ${
                  item.isBought ? "opacity-50" : ""
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleItem(item.id, item.isBought)}
                  className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                    item.isBought
                      ? "bg-green-600 border-green-600"
                      : "border-gray-600 hover:border-orange-500"
                  }`}
                >
                  {item.isBought && <Check className="w-5 h-5 text-white" />}
                </button>

                {/* Ürün Bilgisi */}
                <div className="flex-grow">
                  <div className={`font-medium text-lg ${item.isBought ? "line-through" : ""}`}>
                    {item.names?.[lang] || item.originalName}
                  </div>
                  <div className="text-sm text-gray-400 flex flex-wrap gap-2 mt-1">
                    <span className="bg-gray-700 px-2 py-1 rounded">
                      {item.category}
                    </span>
                    <span className="bg-gray-700 px-2 py-1 rounded">
                      {item.amount} {item.unit}
                    </span>
                    {item.originalName !== item.names?.[lang] && (
                      <span className="text-gray-500 italic">
                        ({item.originalName})
                      </span>
                    )}
                  </div>
                </div>

                {/* Sil Butonu */}
                <button
                  onClick={() => deleteItem(item.id)}
                  className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-600 hover:bg-red-700 flex items-center justify-center transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
