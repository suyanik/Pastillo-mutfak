"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import { Trash2, Check, ChefHat, Wallet, Truck, Send, Save, Edit, X, LayoutGrid, PlusCircle } from "lucide-react";

type LangCode = "tr" | "de" | "pa";

const SUPPLIERS = [
  { id: "metro", name: "Metro" },
  { id: "hal", name: "Hal (Sebze)" },
  { id: "kasap", name: "Kasap" },
  { id: "drink", name: "İçecekçi" },
  { id: "other", name: "Diğer" }
];

// Varsayılan Katalog (Sistem boşsa bunlar yüklenecek)
const DEFAULT_CATALOG = [
  { category: "veg", tr: "Domates", de: "Tomaten", pa: "ਟਮਾਟਰ", defaultPrice: 2.5, defaultSupplier: "hal" },
  { category: "veg", tr: "Soğan", de: "Zwiebeln", pa: "ਪਿਆਜ਼", defaultPrice: 1.2, defaultSupplier: "hal" },
  { category: "meat", tr: "Kıyma", de: "Hackfleisch", pa: "ਕੀਮਾ", defaultPrice: 12.0, defaultSupplier: "kasap" },
  { category: "metro", tr: "Sıvı Yağ", de: "Öl", pa: "ਤੇਲ", defaultPrice: 25.0, defaultSupplier: "metro" },
];

const DICTIONARY = {
  tr: {
    title: "Pastillo Mutfak", placeholder: "Yeni ürün yaz veya yukarıdan seç...",
    unit_kg: "Kg", unit_pcs: "Adet", unit_box: "Kasa", unit_pack: "Paket",
    cat_metro: "Metro", cat_veg: "Sebze", cat_meat: "Kasap", cat_drink: "İçecek", cat_other: "Diğer",
    save_catalog: "Bunu rafa kaydet (Buton yap)", edit_mode: "Düzenle", quick_select: "Raf Seçimi",
    add_btn: "LİSTEYE EKLE"
  },
  de: {
    title: "Pastillo Küche", placeholder: "Neues Produkt...",
    unit_kg: "Kg", unit_pcs: "Stück", unit_box: "Kiste", unit_pack: "Packung",
    cat_metro: "Metro", cat_veg: "Gemüse", cat_meat: "Fleisch", cat_drink: "Getränke", cat_other: "Andere",
    save_catalog: "Im Regal speichern", edit_mode: "Bearbeiten", quick_select: "Regal",
    add_btn: "HINZUFÜGEN"
  },
  pa: {
    title: "ਪਾਸਟਿਲੋ ਰਸੋਈ", placeholder: "ਨਵਾਂ ਉਤਪਾਦ...",
    unit_kg: "ਕਿਲੋ", unit_pcs: "ਟੁਕੜਾ", unit_box: "ਬਾਕਸ", unit_pack: "ਪੈਕਟ",
    cat_metro: "ਮੈਟਰੋ", cat_veg: "ਸਬਜ਼ੀ", cat_meat: "ਮੀਟ", cat_drink: "ਪੀਣ ਵਾਲੇ", cat_other: "ਹੋਰ",
    save_catalog: "ਸ਼ੈਲਫ 'ਤੇ ਸੁਰੱਖਿਅਤ ਕਰੋ", edit_mode: "ਸੰਪਾਦਿਤ ਕਰੋ", quick_select: "ਸ਼ੈਲਫ",
    add_btn: "ਜੋੜੋ"
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
  const [supplier, setSupplier] = useState("metro");

  const [saveToCatalog, setSaveToCatalog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [preSelected, setPreSelected] = useState<any>(null);

  // Data State
  const [items, setItems] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);

  // Verileri Çek
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
  }, []);

  useEffect(() => {
    const q = query(collection(db, "catalog"), orderBy("tr", "asc"));
    return onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        DEFAULT_CATALOG.forEach(async (item) => await addDoc(collection(db, "catalog"), item));
      } else {
        setCatalogItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    });
  }, []);

  const visibleItems = items.filter(item => !item.isArchived);
  const totalCost = useMemo(() => visibleItems.reduce((acc, item) => acc + (Number(item.estimatedPrice) || 0), 0), [visibleItems]);
  const currentCatalog = catalogItems.filter(i => i.category === category);

  // WhatsApp
  const itemsBySupplier = useMemo(() => {
    const groups: Record<string, any[]> = {};
    visibleItems.filter(i => !i.isBought).forEach(item => {
        const sup = item.supplier || 'other';
        if(!groups[sup]) groups[sup] = [];
        groups[sup].push(item);
    });
    return groups;
  }, [visibleItems]);

  const sendToWhatsapp = (supplierId: string) => {
    const supplierName = SUPPLIERS.find(s => s.id === supplierId)?.name || supplierId;
    const productList = itemsBySupplier[supplierId];
    if(!productList?.length) return;
    let message = `🛒 *Pastillo - ${supplierName}*\n\n`;
    productList.forEach(item => message += `- ${item.amount} ${item.unit} ${item.names?.[lang] || item.originalName}\n`);
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Katalog İşlemleri
  const selectFromCatalog = (item: any) => {
    if (isEditMode) return;
    setNewItem(item[lang] || item.tr);
    setPreSelected(item);
    if(item.defaultPrice) setPrice(item.defaultPrice.toString());
    if(item.defaultSupplier) setSupplier(item.defaultSupplier);
    setSaveToCatalog(false);
  };

  const deleteFromCatalog = async (id: string) => {
      if(confirm("Bu kartı raftan kaldırmak istiyor musun?")) await deleteDoc(doc(db, "catalog", id));
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    const itemToAdd = newItem;
    let names = preSelected ? preSelected : { tr: itemToAdd, de: itemToAdd, pa: itemToAdd };
    const cleanNames = { tr: names.tr || itemToAdd, de: names.de || itemToAdd, pa: names.pa || itemToAdd };

    const currentData = {
        lang, cat: category, amt: amount, unit: unit, req: requester, isPre: !!preSelected,
        price: parseFloat(price) || 0, sup: supplier, save: saveToCatalog
    };

    setNewItem(""); setPrice(""); setPreSelected(null); setSaveToCatalog(false);

    const docRef = await addDoc(collection(db, "products"), {
      originalName: itemToAdd, names: cleanNames, category: currentData.cat,
      amount: currentData.amt, unit: currentData.unit, requester: currentData.req,
      estimatedPrice: currentData.price, supplier: currentData.sup,
      isBought: false, isArchived: false, createdAt: serverTimestamp(), boughtAt: null,
      isTranslating: !currentData.isPre
    });

    if (!currentData.isPre) {
       fetch('/api/translate', { method: 'POST', body: JSON.stringify({ productName: itemToAdd, inputLang: currentData.lang }) })
        .then(res => res.json())
        .then(async (translatedNames) => {
            await updateDoc(doc(db, "products", docRef.id), { names: translatedNames, isTranslating: false });
            if (currentData.save) {
                await addDoc(collection(db, "catalog"), {
                    category: currentData.cat, defaultPrice: currentData.price, defaultSupplier: currentData.sup, ...translatedNames
                });
            }
        });
    }
  };

  const toggleItem = async (id: string, stat: boolean) => updateDoc(doc(db, "products", id), { isBought: !stat, boughtAt: !stat ? serverTimestamp() : null });
  const archiveItem = async (id: string) => updateDoc(doc(db, "products", id), { isArchived: true });

  return (
    <div className={`min-h-screen bg-gray-50 p-2 sm:p-4 ${lang === 'pa' ? 'font-gurmukhi' : ''}`}>
      <div className="max-w-xl mx-auto space-y-4">

        {/* 1. ÜST PANEL (Başlık & Bütçe & WhatsApp) */}
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

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <div className="bg-green-50 border border-green-100 px-3 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap">
                    <Wallet className="w-4 h-4 text-green-700" />
                    <span className="font-bold text-green-700">{totalCost.toFixed(0)} €</span>
                </div>
                {Object.keys(itemsBySupplier).map(supId => (
                    <button key={supId} onClick={() => sendToWhatsapp(supId)}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-1 text-xs font-bold shadow-sm whitespace-nowrap active:scale-95 transition-transform hover:bg-green-700">
                        <Send className="w-3 h-3" />
                        {SUPPLIERS.find(s => s.id === supId)?.name} ({itemsBySupplier[supId].length})
                    </button>
                ))}
            </div>
        </div>

        {/* 2. ANA KONTROL KARTI */}
        <div className="bg-white rounded-xl shadow-lg border-t-4 border-orange-500 overflow-hidden">

            {/* A) KATEGORİ SEÇİMİ (Tab Bar) */}
            <div className="flex gap-2 overflow-x-auto p-3 bg-gray-50 border-b scrollbar-hide">
              {[{ id: "veg", icon: "🥦" }, { id: "meat", icon: "🥩" }, { id: "metro", icon: "🛒" }, { id: "drink", icon: "🥤" }]
              .map((cat) => (
                <button key={cat.id} type="button" onClick={() => {setCategory(cat.id); setPreSelected(null); setNewItem("");}}
                    className={`flex items-center gap-1 px-4 py-3 rounded-xl whitespace-nowrap text-sm font-bold transition-all flex-1 justify-center
                    ${category === cat.id ? "bg-orange-600 text-white shadow-md transform scale-105" : "bg-white text-gray-500 border hover:bg-gray-50"}`}>
                  <span className="text-lg">{cat.icon}</span>
                  <span className="capitalize">{t[`cat_${cat.id}` as keyof typeof t]}</span>
                </button>
              ))}
            </div>

            {/* B) RAF DÜZENİ (Grid Görünümü) */}
            <div className="p-3 bg-blue-50/30 min-h-[140px]">
                <div className="flex justify-between items-center mb-3 px-1">
                    <span className="text-xs text-blue-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <LayoutGrid className="w-3 h-3" />
                        {t.quick_select} ({currentCatalog.length})
                    </span>
                    <button onClick={() => setIsEditMode(!isEditMode)} className={`text-xs flex items-center gap-1 px-2 py-1 rounded border transition-colors ${isEditMode ? 'bg-red-100 text-red-600 border-red-200 font-bold' : 'bg-white text-gray-400 hover:text-gray-600'}`}>
                        {isEditMode ? 'Bitti' : <Edit className="w-3 h-3" />}
                    </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {currentCatalog.map((item) => (
                        <div key={item.id} onClick={() => selectFromCatalog(item)}
                             className={`relative p-3 rounded-xl border cursor-pointer transition-all active:scale-95 group
                             ${preSelected?.id === item.id ? 'bg-blue-100 border-blue-400 ring-1 ring-blue-400' : 'bg-white border-blue-100 hover:border-blue-300 hover:shadow-md'}
                             ${isEditMode ? 'opacity-90 bg-red-50/50' : ''}`}>

                            {/* Ürün İsmi */}
                            <div className="font-bold text-gray-800 text-sm truncate">{item[lang] || item.tr}</div>

                            {/* Alt Bilgi (Tedarikçi ve Fiyat) */}
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded capitalize">
                                    {SUPPLIERS.find(s => s.id === item.defaultSupplier)?.name || 'Hal'}
                                </span>
                                {item.defaultPrice > 0 && (
                                    <span className="text-[10px] font-bold text-green-700">{item.defaultPrice}€</span>
                                )}
                            </div>

                            {/* Silme İkonu (Sadece Edit Modunda) */}
                            {isEditMode && (
                                <button onClick={(e) => {e.stopPropagation(); deleteFromCatalog(item.id);}}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg z-10 hover:bg-red-600">
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Boş İse Uyarı */}
                    {currentCatalog.length === 0 && (
                        <div className="col-span-2 text-center py-6 text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-xl">
                            Bu rafta ürün yok.<br/>Aşağıdan ekleyip "Kaydet"e bas.
                        </div>
                    )}
                </div>
            </div>

            {/* 3. GİRİŞ FORMU */}
            <form onSubmit={addItem} className="p-4 bg-white space-y-3 border-t border-gray-100">
                {/* İsim Girişi */}
                <div className="relative">
                    <input type="text" value={newItem} onChange={(e) => {setNewItem(e.target.value); setPreSelected(null);}}
                        placeholder={t.placeholder}
                        className={`w-full p-4 bg-gray-50 border rounded-xl text-lg text-black transition-all focus:ring-2 focus:ring-orange-500 outline-none
                        ${preSelected ? 'border-blue-300 bg-blue-50 pl-10' : 'border-gray-200'}`} />
                    {preSelected && <Check className="absolute left-3 top-5 w-5 h-5 text-blue-500" />}
                </div>

                {/* Detaylar (Miktar, Fiyat, Tedarikçi) */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex gap-2">
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-16 p-3 bg-gray-50 border rounded-xl text-center font-bold text-black text-lg" />
                        <select value={unit} onChange={(e) => setUnit(e.target.value)} className="flex-1 p-3 bg-gray-50 border rounded-xl text-black text-sm font-medium">
                            {['kg', 'pcs', 'box', 'pack'].map(u => <option key={u} value={u}>{t[`unit_${u}` as keyof typeof t]}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input type="number" step="0.5" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-3 pl-6 bg-green-50 border border-green-200 rounded-xl text-green-800 font-bold placeholder-green-300" />
                            <span className="absolute left-2 top-3 text-green-600">€</span>
                        </div>
                        <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="flex-1 p-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-bold">
                            {SUPPLIERS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* ✨ Rafa Kaydet Checkbox (Sadece elle yazılanlar için) */}
                {!preSelected && newItem.length > 0 && (
                    <div className="flex items-center gap-2 bg-orange-50 p-3 rounded-xl border border-orange-100 animate-in fade-in slide-in-from-top-2">
                        <input
                            type="checkbox"
                            id="saveCatalog"
                            checked={saveToCatalog}
                            onChange={(e) => setSaveToCatalog(e.target.checked)}
                            className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 border-orange-300"
                        />
                        <label htmlFor="saveCatalog" className="text-sm font-bold text-orange-800 flex items-center gap-1 cursor-pointer select-none">
                            <Save className="w-4 h-4" />
                            {t.save_catalog}
                        </label>
                    </div>
                )}

                {/* Ekle Butonu */}
                <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-xl font-black text-lg shadow-md hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                    {preSelected ? <Check className="w-6 h-6" /> : <PlusCircle className="w-6 h-6" />}
                    {t.add_btn}
                </button>
            </form>
        </div>

        {/* 3. LİSTE (ALIŞVERİŞ SEPETİ) */}
        <div className="space-y-2 pb-24">
            {visibleItems.map((item) => (
              <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${item.isBought ? "bg-gray-100 border-gray-100 opacity-60" : "bg-white shadow-sm border-l-4 border-l-orange-500"}`}>
                <div onClick={() => toggleItem(item.id, item.isBought)} className="flex items-center gap-3 flex-1 cursor-pointer">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${item.isBought ? "bg-green-500 border-green-500" : "border-gray-300 group-hover:border-orange-500"}`}>
                    {item.isBought && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <h3 className={`font-bold text-gray-800 ${item.isBought ? "line-through text-gray-400" : ""}`}>
                      {item.names?.[lang] || item.originalName}
                    </h3>
                    <div className="text-[11px] text-gray-500 flex flex-wrap gap-2 items-center mt-1">
                       <span className="font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{item.amount} {item.unit}</span>
                       <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                           <Truck className="w-3 h-3" />
                           {SUPPLIERS.find(s => s.id === item.supplier)?.name || item.supplier}
                       </span>
                       {item.estimatedPrice > 0 && <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100 font-bold">{item.estimatedPrice} €</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => archiveItem(item.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
