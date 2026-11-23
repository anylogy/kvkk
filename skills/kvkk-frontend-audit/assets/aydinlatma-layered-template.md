# Katmanli Kisisel Verilerin Korunmasi Aydinlatma Metni (Sablon)

> **Muhendislik ve Hukuki Uyari:** Bu sablon, 6698 sayili Kisisel Verilerin Korunmasi Kanunu (KVKK) m. 10 ve Aydinlatma Yukumlulugunun Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkinda Teblig uyarinca teknik uyum icin hazirlanmistir.
> Resmi hukuki mutalaa yerine gecmez; yayinlanmadan once yetkili hukuk danismani tarafindan onaylanmalidir ve tum `[PLACEHOLDER_...]` alanlari eksiksiz doldurulmalidir.

## Katman 1 - Ozet Bilgilendirme (Form / Arayuz Ustu)

Veri Sorumlusu sifatiyla **[PLACEHOLDER_VERI_SORUMLUSU_UNVANI]** (MERSIS: `[PLACEHOLDER_VERI_SORUMLUSU_MERSIS]`, Adres: `[PLACEHOLDER_VERI_SORUMLUSU_ADRES]`, E-posta: `[PLACEHOLDER_VERI_SORUMLUSU_EPOSTA]`, KEP: `[PLACEHOLDER_VERI_SORUMLUSU_KEP]`), kisisel verilerinizi yalnizca hizmetin sunulmasi, yasal yukumluluklerin yerine getirilmesi ve bilgi guvenliginin saglanmasi amaclariyla 6698 sayili Kanun'un 5. ve 6. maddelerine uygun olarak islemektedir.
Detayli veri kategorisi, hukuki sebep, saklama suresi ve basvuru haklariniz icin asagidaki Katman 2 tam metnini inceleyebilirsiniz.

---

## Katman 2 - Ayrintili Veri Isleme Matrisi

| Veri Kategorisi | Somut Veri Turleri | Isleme Amaci | Kesin Hukuki Sebep (KVKK m. 5/2 veya m. 6/3) | Saklama Suresi | Alici / Aktarim Kapsami |
|:---|:---|:---|:---|:---|:---|
| Kimlik | Ad, soyad, TCKN / YKN, pasaport veya ikamet belgesi numarasi | Kullanici kimlik dogrulamasi ve uyelik kaydinin olusturulmasi | m. 5/2-c (Sozlesmenin kurulmasi/ifasi) ve m. 5/2-ç (Hukuki yukumluluk) | Uyelik suresi + zamanaşimi suresi (`[PLACEHOLDER_SAKLAMA_YIL]` yil) | Yetkili kamu kurum ve kuruluslari (yasal talep halinde) |
| Iletisim | E-posta adresi, telefon numarasi, bildirim tercihi | Hesap guvenligi, dogrulama kodlari ve hizmet bildirimleri | m. 5/2-c (Sozlesmenin ifasi) ve m. 5/2-f (Mesru menfaat) | Uyelik suresi + `[PLACEHOLDER_ILETISIM_SAKLAMA_YIL]` yil | Yurt ici TLS e-posta/SMS altyapi saglayicisi (`[PLACEHOLDER_YURT_ICI_ALICI]`) |
| Islem Guvenligi | IP adresi, giris-cikis loglari, oturum kimligi, istek zaman damgasi | Bilgi guvenligi denetimi ve 5651 sayili Kanun trafik logu | m. 5/2-a (Kanunlarda acikca ongorulmesi - 5651 s.K.) ve m. 5/2-ç | 2 yil (5651 s.K. zorunlu suresi) | Yetkili adli/idari merciler ve yurt ici barindirma altyapisi |
| Ozel Nitelikli (Arizi Belge Tarama) | Kimlik/pasaport gorselinde yer alabilen din, kan grubu veya biyometrik yuz eslestirme verisi | Yalnizca kullanicinin bilerek yukledigi belge dogrulama akisinda maskeleme/ayristirma | m. 6/3-a (Acik Riza) veya m. 6/3-b (Kanunlarda acikca ongorulmesi) | Dogrulama sonrasi aninda imha / azami `[PLACEHOLDER_OZEL_SAKLAMA_GUN]` gun | Aktarim yapilmaz (Kurul 2018/10 sayili Karar tedbirleri altinda saklanir) |
| Ticari Ileti (ETK/IYS) | E-posta / GSM onay kaydi | Kampanya ve tanitim iletilerinin gonderimi (KVKK riza metninden bagimsiz) | 6563 sayili ETK ve IYS onayi (KVKK m. 5/1 ayri acik riza) | Onay geri alinincaya kadar + 3 yil (ETK mevzuati) | Ileti Yonetim Sistemi (IYS) |

## Kisisel Verilerin Toplanma Yontemi

Kisisel verileriniz; `[PLACEHOLDER_WEB_ALANI]` internet sitesi, mobil/web formlari, TLS sifreli belge yukleme arayuzleri ve guvenlik loglama mekanizmalari araciligiyla tamamen veya kismen otomatik yollarla toplanmaktadir.

## Yurt Disina Aktarim Bilgilendirmesi (KVKK m. 9)

Kisisel verileriniz kural olarak Turkiye sinirlari icerisinde barindirilan sunucularda islenmektedir.
Zorunlu bir yurt disi aktarim soz konusu oldugunda, 6698 sayili Kanun'un 9. maddesi uyarinca yalnizca Kurul yeterlilik karari, Kuruma 5 is gunu icinde bildirilen Standart Sozlesme (SS-1 - SS-4) veya diger uygun guvenceler cercevesinde islem yapilir.

## Ilgili Kisinin Haklari ve Basvuru (KVKK m. 11)

Kanun'un 11. maddesi kapsamindaki taleplerinizi **Veri Sorumlusuna Basvuru Usul ve Esaslari Hakkinda Teblig** uyarinca yazili olarak `[PLACEHOLDER_VERI_SORUMLUSU_ADRES]` adresine, KEP uzerinden `[PLACEHOLDER_VERI_SORUMLUSU_KEP]` adresine veya sistemimizde kayitli e-posta adresinizden `[PLACEHOLDER_VERI_SORUMLUSU_EPOSTA]` adresine iletebilirsiniz.
Basvurulariniz en gec **30 gun** icerisinde ucretsiz olarak sonuclandirilir.
