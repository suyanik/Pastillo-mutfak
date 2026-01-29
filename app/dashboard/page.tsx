"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import { Trash2, Check, ChefHat, Wallet, Truck, Send } from "lucide-react";

// --- DİL AYARLARI ---
type LangCode = "tr" | "de" | "pa";

// --- TEDARİKÇİ LİSTESİ ---
const SUPPLIERS = [
  { id: "metro", name: "Metro" },
  { id: "hal", name: "Hal (Sebze)" },
  { id: "kasap", name: "Kasap" },
  { id: "drink", name: "İçecekçi" },
  { id: "other", name: "Diğer" }
];

// --- HAZIR KATALOG (Hızlı Seçim) ---
// defaultPrice: Tahmini Fiyat, defaultSupplier: Varsayılan Tedarikçi
const CATALOG: Record<string, { tr: string; de: string; pa: string; defaultPrice?: number; defaultSupplier?: string }[]> = {
  veg: [
    { tr: "Domates", de: "Tomaten", pa: "ਟਮਾਟਰ", defaultPrice: 2.5, defaultSupplier: "hal" },
    { tr: "Soğan", de: "Zwiebeln", pa: "ਪਿਆਜ਼", defaultPrice: 1.2, defaultSupplier: "hal" },
    { tr: "Patates", de: "Kartoffeln", pa: "ਆਲੂ", defaultPrice: 1.5, defaultSupplier: "hal" },
    { tr: "Biber", de: "Paprika", pa: "ਸ਼ਿਮਲਾ ਮਿਰਚ", defaultPrice: 3.0, defaultSupplier: "hal" },
  ],
  meat: [
    { tr: "Kıyma", de: "Hackfleisch", pa: "ਕੀਮਾ", defaultPrice: 12.0, defaultSupplier: "kasap" },
    { tr: "Tavuk", de: "Hähnchen", pa: "ਚਿਕਨ", defaultPrice: 8.5, defaultSupplier: "metro" }, // Tavuk Metro'dan da olabilir
  ],
  metro: [
    { tr: "Yağ", de: "Öl", pa: "ਤੇਲ", defaultPrice: 25.0, defaultSupplier: "metro" },
    { tr: "Un", de: "Mehl", pa: "ਆਟਾ", defaultPrice: 14.0, defaultSupplier: "metro" },
    { tr: "Pirinç", de: "Reis", pa: "ਚਾਵਲ", defaultPrice: 18.0, defaultSupplier: "metro" },
  ],
  drink: [
    { tr: "Kola", de: "Cola", pa: "ਕੋਲਾ", defaultPrice: 22.0, defaultSupplier: "drink" },
    { tr: "Bira", de: "Bier", pa: "ਬੀਅਰ", defaultPrice: 28.0, defaultSupplier: "drink" },
  ]
};

const DICTIONARY = {
  tr: {
    title: "Pastillo Mutfak", placeholder: "Ürün adı...",
    unit_kg: "Kg", unit_pcs: "Adet", unit_box: "Kasa", unit_pack: "Paket",
    cat_metro: "Metro", cat_veg: "Sebze", cat_meat: "Kasap", cat_drink: "İçecek", cat_other: "Diğer",
    total_est: "Tahmini Tutar", supplier: "Tedarikçi", send_whatsapp: "WhatsApp Sipariş"
  },
  de: {
    title: "Pastillo Küche", placeholder: "Produktname...",
    unit_kg: "Kg", unit_pcs: "Stück", unit_box: "Kiste", unit_pack: "Packung",
    cat_metro: "Metro", cat_veg: "Gemüse", cat_meat: "Fleisch", cat_drink: "Getränke", cat_other: "Andere",
    total_est: "Geschätzte Summe", supplier: "Lieferant", send_whatsapp: "WhatsApp Bestellen"
  },
  pa: {
    title: "ਪਾਸਟਿਲੋ ਰਸੋਈ", placeholder: "ਉਤਪਾਦ ਦਾ ਨਾਮ...",
    unit_kg: "ਕਿਲੋ", unit_pcs: "ਟੁਕੜਾ", unit_box: "ਬਾਕਸ", unit_pack: "ਪੈਕਟ",
    cat_metro: "ਮੈਟਰੋ", cat_veg: "ਸਬਜ਼ੀ", cat_meat: "ਮੀਟ", cat_drink: "ਪੀਣ ਵਾਲੇ", cat_other: "ਹੋਰ",
    total_est: "ਕੁੱਲ ਅਨੁਮਾਨ", supplier: "ਸਪਲਾਇਰ", send_whatsapp: "WhatsApp ਆਰਡਰ"
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
  const [price, setPrice] = useState("");
  const [supplier, setSupplier] = useState("metro"); // 🚚 Tedarikçi State

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

  // 💰 Toplam Tutar
  const totalCost = useMemo(() => {
    return visibleItems.reduce((acc, item) => acc + (Number(item.estimatedPrice) || 0), 0);
  }, [visibleItems]);

  // 🚚 Tedarikçiye Göre Grupla (Sipariş Göndermek İçin)
  const itemsBySupplier = useMemo(() => {
    const groups: Record<string, any[]> = {};
    visibleItems.filter(i => !i.isBought).forEach(item => { // Sadece alınmamışlar
        const sup = item.supplier || 'other';
        if(!groups[sup]) groups[sup] = [];
        groups[sup].push(item);
    });
    return groups;
  }, [visibleItems]);

  // 📱 WhatsApp Gönderme Fonksiyonu
  const sendToWhatsapp = (supplierId: string) => {
    const supplierName = SUPPLIERS.find(s => s.id === supplierId)?.name || supplierId;
    const productList = itemsBySupplier[supplierId];

    if(!productList || productList.length === 0) return;

    let message = `🛒 *Pastillo Siparişi - ${supplierName}*\n\n`;
    productList.forEach(item => {
        message += `- ${item.amount} ${item.unit} ${item.names?.[lang] || item.originalName}\n`;
    });
    message += `\n📅 Tarih: ${new Date().toLocaleDateString()}`;

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const selectFromCatalog = (item: any) => {
    setNewItem(item[lang]);
    setPreSelected(item);
    if(item.defaultPrice) setPrice(item.defaultPrice.toString());
    if(item.defaultSupplier) setSupplier(item.defaultSupplier); // 🚚 Otomatik Tedarikçi Seç
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    const itemToAdd = newItem;
    const names = preSelected ? preSelected : { tr: itemToAdd, de: itemToAdd, pa: itemToAdd };
    const currentData = {
        lang, cat: category, amt: amount, unit: unit, req: requester, isPre: !!preSelected,
        price: parseFloat(price) || 0,
        sup: supplier // 🚚 Tedarikçi
    };

    setNewItem(""); setPrice(""); setPreSelected(null);

    addDoc(collection(db, "products"), {
      originalName: itemToAdd,
      names: names,
      category: currentData.cat,
      amount: currentData.amt,
      unit: currentData.unit,
      requester: currentData.req,
      estimatedPrice: currentData.price,
      supplier: currentData.sup, // 🚚 Veritabanına Yaz
      isBought: false, isArchived: false,
      createdAt: serverTimestamp(), boughtAt: null,
      isTranslating: !currentData.isPre
    }).then((docRef) => {
        if (!currentData.isPre) {
           fetch('/api/translate', {
                method: 'POST', body: JSON.stringify({ productName: itemToAdd, inputLang: currentData.lang })
            }).then(res => res.json()).then(translatedNames => {
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

        {/* ÜST BAR */}
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

            {/* 💰 BÜTÇE + 🚚 SİPARİŞ BUTONLARI */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <div className="bg-green-50 border border-green-100 px-3 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap">
                    <Wallet className="w-4 h-4 text-green-700" />
                    <span className="font-bold text-green-700">{totalCost.toFixed(0)} €</span>
                </div>
                {/* 🚚 AKTİF TEDARİKÇİLER İÇİN WHATSAPP BUTONLARI */}
                {Object.keys(itemsBySupplier).map(supId => (
                    <button key={supId} onClick={() => sendToWhatsapp(supId)}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-1 text-xs font-bold shadow-sm whitespace-nowrap active:scale-95 transition-transform hover:bg-green-700">
                        <Send className="w-3 h-3" />
                        {SUPPLIERS.find(s => s.id === supId)?.name} ({itemsBySupplier[supId].length})
                    </button>
                ))}
            </div>
        </div>

        {/* ANA FORM */}
        <div className="bg-white rounded-xl shadow-lg border-t-4 border-orange-500 overflow-hidden">
            {/* Kategori */}
            <div className="flex gap-2 overflow-x-auto p-3 bg-gray-50 border-b scrollbar-hide">
              {[{ id: "veg", icon: "🥦" }, { id: "meat", icon: "🥩" }, { id: "metro", icon: "🛒" }, { id: "drink", icon: "🥤" }]
              .map((cat) => (
                <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={`flex items-center gap-1 px-3 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${category === cat.id ? "bg-orange-600 text-white" : "bg-white text-gray-600 border"}`}>
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

            <form onSubmit={addItem} className="p-4 space-y-3">
                <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder={t.placeholder} className="w-full p-3 bg-gray-50 border rounded-xl text-lg text-black" />

                <div className="grid grid-cols-2 gap-2">
                    {/* Miktar & Birim */}
                    <div className="flex gap-2">
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-16 p-2 bg-gray-50 border rounded-lg text-center font-bold text-black" />
                        <select value={unit} onChange={(e) => setUnit(e.target.value)} className="flex-1 p-2 bg-gray-50 border rounded-lg text-black text-sm">
                            {['kg', 'pcs', 'box', 'pack'].map(u => <option key={u} value={u}>{t[`unit_${u}` as keyof typeof t]}</option>)}
                        </select>
                    </div>

                    {/* Fiyat & Tedarikçi */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input type="number" step="0.5" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-2 pl-6 bg-green-50 border border-green-200 rounded-lg text-green-800 font-bold placeholder-green-300" />
                            <span className="absolute left-2 top-2 text-green-600">€</span>
                        </div>
                        <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="flex-1 p-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs font-bold">
                            {SUPPLIERS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>

                <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg shadow-md hover:bg-green-700 active:scale-98 transition-all">+</button>
            </form>
        </div>

        {/* LİSTE - TEDARİKÇİYE GÖRE GRUPLANMIŞ */}
        <div className="space-y-4 pb-20">
            {Object.keys(itemsBySupplier).map(supId => (
                <div key={supId}>
                    {/* Tedarikçi Başlığı */}
                    <div className="flex items-center gap-2 mb-2">
                        <Truck className="w-5 h-5 text-blue-600" />
                        <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">
                            {SUPPLIERS.find(s => s.id === supId)?.name} ({itemsBySupplier[supId].length})
                        </h2>
                    </div>

                    {/* Ürünler */}
                    <div className="space-y-2">
                        {itemsBySupplier[supId].map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border bg-white shadow-sm">
                            <div onClick={() => toggleItem(item.id, item.isBought)} className="flex items-center gap-3 flex-1 cursor-pointer">
                              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-gray-300">
                                {item.isBought && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-800">
                                  {item.names?.[lang] || item.originalName}
                                </h3>
                                <div className="text-[11px] text-gray-500 flex gap-2 items-center">
                                   <span className="font-bold text-blue-600 uppercase">{item.requester}</span>
                                   <span>•</span>
                                   <span>{item.amount} {item.unit}</span>
                                   {item.estimatedPrice > 0 && (
                                       <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">
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
            ))}

            {/* SATINALINMIŞLAR (Tedarikçi gösterme, alt kısımda) */}
            {visibleItems.filter(i => i.isBought).length > 0 && (
                <div>
                    <h2 className="font-bold text-gray-400 text-sm uppercase tracking-wide mb-2">✓ Satın Alındı</h2>
                    <div className="space-y-2">
                        {visibleItems.filter(i => i.isBought).map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border bg-gray-100 opacity-60">
                            <div onClick={() => toggleItem(item.id, item.isBought)} className="flex items-center gap-3 flex-1 cursor-pointer">
                              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center bg-green-500 border-green-500">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                              <div>
                                <h3 className="font-medium line-through text-gray-400">
                                  {item.names?.[lang] || item.originalName}
                                </h3>
                                <div className="text-[11px] text-gray-400 flex gap-2 items-center">
                                   <span>{item.amount} {item.unit}</span>
                                </div>
                              </div>
                            </div>
                            <button onClick={() => archiveItem(item.id)} className="p-2 text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
