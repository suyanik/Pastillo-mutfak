"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import { Trash2, Check, ChefHat, Euro, Wallet } from "lucide-react";

// --- DİL VE AYARLAR ---
type LangCode = "tr" | "de" | "pa";

// --- HAZIR KATALOG (Hızlı Seçim İçin) ---
const CATALOG: Record<string, { tr: string; de: string; pa: string; defaultPrice?: number }[]> = {
  veg: [
    { tr: "Domates", de: "Tomaten", pa: "ਟਮਾਟਰ", defaultPrice: 2.5 },
    { tr: "Soğan", de: "Zwiebeln", pa: "ਪਿਆਜ਼", defaultPrice: 1.2 },
    { tr: "Patates", de: "Kartoffeln", pa: "ਆਲੂ", defaultPrice: 1.5 },
    { tr: "Biber", de: "Paprika", pa: "ਸ਼ਿਮਲਾ ਮਿਰਚ", defaultPrice: 3.0 },
  ],
  meat: [
    { tr: "Kıyma", de: "Hackfleisch", pa: "ਕੀਮਾ", defaultPrice: 12.0 },
    { tr: "Tavuk", de: "Hähnchen", pa: "ਚਿਕਨ", defaultPrice: 8.5 },
    { tr: "Sucuk", de: "Wurst", pa: "ਲੰਗੂਚਾ", defaultPrice: 15.0 },
  ],
  metro: [
    { tr: "Yağ", de: "Öl", pa: "ਤੇਲ", defaultPrice: 25.0 },
    { tr: "Un", de: "Mehl", pa: "ਆਟਾ", defaultPrice: 14.0 },
    { tr: "Pirinç", de: "Reis", pa: "ਚਾਵਲ", defaultPrice: 18.0 },
  ],
  drink: [
    { tr: "Kola", de: "Cola", pa: "ਕੋਲਾ", defaultPrice: 22.0 },
    { tr: "Bira", de: "Bier", pa: "ਬੀਅਰ", defaultPrice: 28.0 },
  ]
};

const DICTIONARY = {
  tr: {
    title: "Pastillo Mutfak", placeholder: "Ürün adı...",
    role_chef: "Şef", role_bar: "Bar", role_kitchen: "Mutfak",
    unit_kg: "Kg", unit_pcs: "Adet", unit_box: "Kasa", unit_pack: "Paket",
    cat_metro: "Metro", cat_veg: "Sebze", cat_meat: "Kasap", cat_drink: "İçecek", cat_other: "Diğer",
    total_est: "Tahmini Tutar"
  },
  de: {
    title: "Pastillo Küche", placeholder: "Produktname...",
    role_chef: "Chef", role_bar: "Bar", role_kitchen: "Küche",
    unit_kg: "Kg", unit_pcs: "Stück", unit_box: "Kiste", unit_pack: "Packung",
    cat_metro: "Metro", cat_veg: "Gemüse", cat_meat: "Fleisch", cat_drink: "Getränke", cat_other: "Andere",
    total_est: "Geschätzte Summe"
  },
  pa: {
    title: "ਪਾਸਟਿਲੋ ਰਸੋਈ", placeholder: "ਉਤਪਾਦ ਦਾ ਨਾਮ...",
    role_chef: "ਸ਼ੈੱਫ", role_bar: "ਬਾਰ", role_kitchen: "ਰਸੋਈ",
    unit_kg: "ਕਿਲੋ", unit_pcs: "ਟੁਕੜਾ", unit_box: "ਬਾਕਸ", unit_pack: "ਪੈਕਟ",
    cat_metro: "ਮੈਟਰੋ", cat_veg: "ਸਬਜ਼ੀ", cat_meat: "ਮੀਟ", cat_drink: "ਪੀਣ ਵਾਲੇ", cat_other: "ਹੋਰ",
    total_est: "ਕੁੱਲ ਅਨੁਮਾਨ"
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

  // 💰 YENİ: Fiyat State'i
  const [price, setPrice] = useState("");

  const [preSelected, setPreSelected] = useState<any>(null);

  // Data State
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const visibleItems = items.filter(item => !item.isArchived);

  // 💰 YENİ: Toplam Tutar Hesaplama (Sadece alınmamışlar veya hepsi)
  const totalCost = useMemo(() => {
    return visibleItems.reduce((acc, item) => acc + (Number(item.estimatedPrice) || 0), 0);
  }, [visibleItems]);

  const selectFromCatalog = (item: any) => {
    setNewItem(item[lang]);
    setPreSelected(item);
    // 💰 Eğer katalogda varsayılan fiyat varsa onu da getir
    if(item.defaultPrice) setPrice(item.defaultPrice.toString());
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    const itemToAdd = newItem;
    const names = preSelected ? preSelected : { tr: itemToAdd, de: itemToAdd, pa: itemToAdd };
    const currentData = {
        lang, cat: category, amt: amount, unit: unit, req: requester, isPre: !!preSelected,
        price: parseFloat(price) || 0 // 💰 Fiyatı sayıya çevir
    };

    // Temizlik
    setNewItem(""); setPrice(""); setPreSelected(null);

    // Veritabanına Ekle
    addDoc(collection(db, "products"), {
      originalName: itemToAdd,
      names: names,
      category: currentData.cat,
      amount: currentData.amt,
      unit: currentData.unit,
      requester: currentData.req,
      estimatedPrice: currentData.price, // 💰 Kayıt
      isBought: false, isArchived: false,
      createdAt: serverTimestamp(), boughtAt: null,
      isTranslating: !currentData.isPre
    }).then((docRef) => {
        if (!currentData.isPre) {
           // Çeviri API'si (Önbellekli)
           fetch('/api/translate', {
                method: 'POST',
                body: JSON.stringify({ productName: itemToAdd, inputLang: currentData.lang })
            })
            .then(res => res.json())
            .then(translatedNames => {
                updateDoc(doc(db, "products", docRef.id), { names: translatedNames, isTranslating: false });
            });
        }
    });
  };

  const toggleItem = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, "products", id), { isBought: !currentStatus, boughtAt: !currentStatus ? serverTimestamp() : null });
  };

  const archiveItem = async (id: string) => {
    await updateDoc(doc(db, "products", id), { isArchived: true });
  };

  return (
    <div className={`min-h-screen bg-gray-50 p-2 sm:p-4 ${lang === 'pa' ? 'font-gurmukhi' : ''}`}>
      <div className="max-w-xl mx-auto space-y-4">

        {/* ÜST BAR ve CANLI BÜTÇE 💰 */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
            <div className="flex justify-between items-center">
                <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <ChefHat className="text-orange-600 w-6 h-6" />
                    {t.title}
                </h1>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    {(["tr", "de", "pa"] as LangCode[]).map((l) => (
                    <button key={l} onClick={() => setLang(l)} className={`px-2 py-1 rounded font-bold text-xs ${lang === l ? "bg-white text-orange-600 shadow" : "text-gray-400"}`}>
                        {l.toUpperCase()}
                    </button>
                    ))}
                </div>
            </div>
            {/* TOPLAM TUTAR GÖSTERGESİ */}
            <div className="bg-green-50 border border-green-100 p-2 rounded-lg flex justify-between items-center">
                <div className="flex items-center gap-2 text-green-700">
                    <Wallet className="w-5 h-5" />
                    <span className="text-sm font-bold">{t.total_est}:</span>
                </div>
                <span className="text-lg font-black text-green-700">{totalCost.toFixed(2)} €</span>
            </div>
        </div>

        {/* ANA FORM */}
        <div className="bg-white rounded-xl shadow-lg border-t-4 border-orange-500 overflow-hidden">
            {/* Kategori Seçimi */}
            <div className="flex gap-2 overflow-x-auto p-3 bg-gray-50 border-b scrollbar-hide">
              {[{ id: "veg", icon: "🥦" }, { id: "meat", icon: "🥩" }, { id: "metro", icon: "🛒" }, { id: "drink", icon: "🥤" }]
              .map((cat) => (
                <button key={cat.id} type="button" onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                    category === cat.id ? "bg-orange-600 text-white" : "bg-white text-gray-600 border"
                  }`}>
                  <span>{cat.icon}</span> <span className="capitalize">{t[`cat_${cat.id}` as keyof typeof t]}</span>
                </button>
              ))}
            </div>

            {/* Hızlı Seçim */}
            <div className="p-3 bg-blue-50/50 flex flex-wrap gap-2">
                {CATALOG[category as keyof typeof CATALOG]?.map((item, idx) => (
                    <button key={idx} onClick={() => selectFromCatalog(item)} className="bg-white border border-blue-100 text-gray-700 px-3 py-1 rounded-lg text-sm shadow-sm active:scale-95">
                        {item[lang]}
                    </button>
                ))}
            </div>

            <form onSubmit={addItem} className="p-4 space-y-4">
                <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder={t.placeholder} className="w-full p-3 bg-gray-50 border rounded-xl text-lg text-black" />

                <div className="flex items-center gap-2">
                    {/* Miktar */}
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-16 p-3 bg-gray-50 border rounded-xl text-center font-bold text-black" />

                    {/* Birim */}
                    <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-20 p-3 bg-gray-50 border rounded-xl text-black text-sm">
                        {['kg', 'pcs', 'box', 'pack'].map(u => <option key={u} value={u}>{t[`unit_${u}` as keyof typeof t]}</option>)}
                    </select>

                    {/* 💰 FİYAT GİRİŞİ */}
                    <div className="relative flex-1">
                        <input
                            type="number"
                            step="0.5"
                            placeholder="0 €"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full p-3 pl-8 bg-green-50 border border-green-200 rounded-xl text-green-800 font-bold placeholder-green-300"
                        />
                        <Euro className="w-4 h-4 text-green-600 absolute left-2.5 top-3.5" />
                    </div>

                    <button type="submit" className="bg-green-600 text-white w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-md">+</button>
                </div>
            </form>
        </div>

        {/* LİSTE */}
        <div className="space-y-2 pb-20">
            {visibleItems.map((item) => (
              <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border ${item.isBought ? "bg-gray-100" : "bg-white shadow-sm"}`}>
                <div onClick={() => toggleItem(item.id, item.isBought)} className="flex items-center gap-3 flex-1 cursor-pointer">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${item.isBought ? "bg-green-500 border-green-500" : "border-gray-300"}`}>
                    {item.isBought && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <h3 className={`font-medium ${item.isBought ? "line-through text-gray-400" : "text-gray-800"}`}>
                      {item.names?.[lang] || item.originalName}
                    </h3>
                    <div className="text-[11px] text-gray-500 flex gap-2 items-center">
                       <span className="font-bold text-blue-600 uppercase">{item.requester}</span>
                       <span>•</span>
                       <span>{item.amount} {item.unit}</span>
                       {/* 💰 Fiyat Gösterimi */}
                       {item.estimatedPrice > 0 && (
                           <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold flex items-center">
                               {item.estimatedPrice} €
                           </span>
                       )}
                    </div>
                  </div>
                </div>
                <button onClick={() => archiveItem(item.id)} className="p-2 text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
