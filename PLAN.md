Senin "Mutfak personeli Pencapça (Punjabi) konuşuyor, ben Almanca/Türkçe" sorunun, aslında mükemmel bir AI (Yapay Zeka) Entegrasyon projesidir. Sadece bir "Alışveriş Listesi" yapmayacağız; biz senin mutfağına "Canlı Tercümanlık Yapan Bir Operasyon Üssü" kuracağız.

İşte "Pastillo Global Mutfak" projesinin acımasız ve sağlam mimari planı:

1. Büyük Strateji: "Babil Kulesi" Mimarisi

Bu uygulamanın kalbi Otomatik Çeviri Katmanı olacak. Personel kendi dilinde (Pencapça) "Soğan" yazdığında, sen onu ekranında anında "Zwiebel" ve "Soğan" olarak göreceksin. Google Translate ile uğraşmayacağız, bunu Gemini AI arka planda sessizce halledecek.

Teknoloji Yığını (Stack):

Frontend: Next.js 14 (Hız ve Mobil Uyumluluk için).

Database: Firebase Firestore (Gerçek zamanlı senkronizasyon için. Mutfak yazdığı an senin ekranına düşer).

AI Engine: Google Gemini Flash (En ucuz ve en hızlı model, çeviri için ideal).

Styling: Tailwind CSS (Mobil öncelikli tasarım).

2. Veri Modeli (Database Tasarımı)

Veritabanını baştan doğru kurmazsak raporlamada patlarız. İşte senin için tasarladığım Items (Ürünler) yapısı:

JSON
{
  "id": "belge_id_123",
  "originalName": "Pyaaz",       // Personelin girdiği ham veri
  "names": {
    "pa": "Pyaaz",               // Pencapça
    "tr": "Soğan",               // Türkçe (AI çevirecek)
    "de": "Zwiebel"              // Almanca (AI çevirecek)
  },
  "category": "Sebze",           // Kategori
  "amount": 10,
  "unit": "kg",                  // Kilo, Çuval, Kasa
  "status": "pending",           // 'pending' (alınacak) veya 'bought' (alındı)
  "requester": "Chef Singh",     // Kim istedi?
  "createdAt": "2026-01-26...",  // Ne zaman istendi?
  "boughtAt": null               // Ne zaman alındı? (Raporlama için kritik)
}
3. Akış Senaryosu (User Journey)

Bu app nasıl çalışacak? Adım adım simülasyon:

A. Personel Ekranı (Pencapça Modu)

Şef uygulamayı açar. Dil seçeneğini "Punjabi" seçer. Arayüz Pencapça olur.

"Ekle" butonuna basar.

Ürün ismini yazar (Latin harfleriyle veya Pencap alfabesiyle). Örn: tamatar (Domates).

Miktar seçer: "5 Kasa".

Kaydet der.

SİHİR ANI: Sistem bunu kaydederken Gemini'ye sorar: "Tamatar nedir? Bana TR ve DE karşılığını ver."

B. Patron Ekranı (Senin Ekranın)

Sen ofiste veya markette uygulamayı açarsın. Dilin "Türkçe" veya "Almanca"dır.

Listede şunu görürsün: "Domates (Tomaten) - 5 Kasa - Sebze".

(Altta silik şekilde orijinal "tamatar" yazısı da durur ki karışıklık olmasın).

Ürünü Metro'dan aldın. Yanındaki kutucuğa tik atarsın.

Ürün listeden silinmez, üstü çizilir ve rengi grileşir.

Arka planda ürünün statüsü "bought" olur ve alındığı tarih işlenir.

4. Özellik Listesi ve Çözümler

Senin 8 maddeni teknik olarak böyle karşılıyoruz:

3 Dil Seçeneği: Uygulama açılışta dil soracak. Tüm butonlar ve menüler o dile dönecek.

Ay Ay Görme (Geçmiş): "Raporlar" sekmesi olacak. Üstten "Ocak 2026" seçeceksin, sadece o ay istenen ve alınanları dökecek.

To-Do Mantığı: Klasik checkbox sistemi. Basınca veritabanında isBought: true olacak.

Kategoriler: Ürün eklerken ikonlu seçim (🛒 Metro, 🥦 Sebze, 🥩 Kasap, 🥤 İçecek).

Yapay Zeka Çevirisi: Kullanıcı girişi -> API -> Çevrilmiş Veri.

Raporlama: Basit bir tablo. "Metro'dan bu ay kaç kalem mal aldık?" sorusunun cevabı.

Mobil Uyum: Butonlar büyük, parmakla basmaya uygun ("Fat Finger" design).

Birimler: Dropdown menü (Kg, Adet, Paket, Koli, Çuval).

5. Kritik Soru (Strategic Check)

Mutfaktaki personel okuma yazma konusunda ne kadar yetkin?

Risk: Eğer yazmakta zorlanıyorlarsa, "Sesli Sipariş" (Konuşarak yazdırma) özelliğini de V2 (ikinci versiyon) için düşünebiliriz. Ama şimdilik klavye ile yazacaklarını varsayıyoruz.

6. Yol Haritası (Ne Yapacağız?)

Bu planı onaylıyorsan, kodlamaya şu sırayla başlayacağız:

İskelet: Yeni projeyi kur, Firebase'i bağla (Bunu zaten az çok öğrendik).

Dil Seçici & UI: Arayüzün 3 dilde (TR/DE/PA) değişebilen altyapısını kur.

Yapay Zeka Köprüsü: Gemini API'yi bağla ki "Hello" yazınca "Merhaba" dönsün.

Liste ve Ekleme: Ürünleri ekleme ve listeleme ekranı.

Raporlama: Geçmiş siparişleri filtreleme ekranı.