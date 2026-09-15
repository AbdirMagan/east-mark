-- East-Market :: 0018 :: Home carousel
--
-- The home page hero on the web and in the Android app is a carousel of
-- advertisements with placement 'home_hero'. A promotional slide needs more
-- than title / subtitle / image: a discount badge ("60% OFF"), the button
-- text, a colour theme and an icon. With those, a slide renders the same on
-- both apps without anyone having to design an image for it.
--
-- Writes stay service-role only (0014 revoked insert/update/delete on
-- advertisements from anon and authenticated); staff edit slides through the
-- backend's /admin/ads endpoints. Reads keep the 0009 policy: running ads are
-- public.

alter table public.advertisements
  add column if not exists badge     text,
  add column if not exists cta_label text,
  add column if not exists theme     text not null default 'night',
  add column if not exists icon      text;

do $$ begin
  alter table public.advertisements
    add constraint ads_badge_length check (badge is null or char_length(badge) <= 24),
    add constraint ads_cta_length check (cta_label is null or char_length(cta_label) <= 40),
    add constraint ads_icon_length check (icon is null or char_length(icon) <= 32),
    add constraint ads_theme_valid check (theme in ('night', 'acacia', 'clay', 'sun', 'navy'));
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Starter slides, in all four languages. Idempotent: a slide is only added if
-- no home_hero ad with the same title exists, so re-running is harmless and
-- slides staff have edited or deleted are not brought back under a new title.
-- ---------------------------------------------------------------------------
insert into public.advertisements
  (title, subtitle, badge, cta_label, theme, icon, placement, target_type, target_value, status, priority, translations)
select v.title, v.subtitle, v.badge, v.cta_label, v.theme, v.icon,
       'home_hero'::public.ad_placement, v.target_type, v.target_value,
       'running'::public.ad_status, v.priority, v.translations::jsonb
from (values
  (
    'Buy & Sell Across East Africa',
    'Verified sellers, direct WhatsApp and phone, prices in your currency. Five countries, one market.',
    null, 'Browse listings', 'night', 'map', 'search', '', 50,
    '{"so":{"title":"Iibso oo Iibi Bariga Afrika oo dhan","subtitle":"Iibiyeyaal la xaqiijiyay, WhatsApp iyo taleefan toos ah, qiimo lacagtaada ah. Shan dal, hal suuq.","cta_label":"Daalaco alaabta"},
      "am":{"title":"በምሥራቅ አፍሪካ ይግዙ እና ይሽጡ","subtitle":"የተረጋገጡ ሻጮች፣ ቀጥተኛ WhatsApp እና ስልክ፣ በገንዘብዎ ዋጋ። አምስት አገሮች፣ አንድ ገበያ።","cta_label":"ዝርዝሮችን ያስሱ"},
      "sw":{"title":"Nunua na Uza Afrika Mashariki Yote","subtitle":"Wauzaji waliothibitishwa, WhatsApp na simu moja kwa moja, bei kwa sarafu yako. Nchi tano, soko moja.","cta_label":"Vinjari matangazo"}}'
  ),
  (
    'Mega Electronics Deals',
    'Phones, laptops and TVs from verified sellers near you.',
    'UP TO 60% OFF', 'Shop electronics', 'clay', 'electronics', 'category', 'electronics', 40,
    '{"so":{"title":"Dhimis Weyn oo Qalabka Elektaroonigga","subtitle":"Taleefanno, laptop iyo TV ka iibiyeyaal la xaqiijiyay oo kuu dhow.","badge":"ILAA 60% DHIMIS","cta_label":"Iibso elektaroonig"},
      "am":{"title":"ትልቅ የኤሌክትሮኒክስ ቅናሾች","subtitle":"ስልኮች፣ ላፕቶፖች እና ቴሌቪዥኖች በአቅራቢያዎ ካሉ የተረጋገጡ ሻጮች።","badge":"እስከ 60% ቅናሽ","cta_label":"ኤሌክትሮኒክስ ይግዙ"},
      "sw":{"title":"Ofa Kubwa za Elektroniki","subtitle":"Simu, kompyuta mpakato na TV kutoka kwa wauzaji waliothibitishwa karibu nawe.","badge":"PUNGUZO HADI 60%","cta_label":"Nunua elektroniki"}}'
  ),
  (
    'Sell Your Car, House or Land Free',
    'Post in two minutes and reach buyers in Hargeisa, Mogadishu, Addis Ababa, Nairobi and Djibouti.',
    'FREE', 'Start selling', 'acacia', 'car', 'url', '/sell', 30,
    '{"so":{"title":"Iibi Baabuurkaaga, Gurigaaga ama Dhulkaaga Bilaash","subtitle":"Ku dhaji laba daqiiqo gudahood oo gaadh iibsadayaal ku sugan Hargeysa, Muqdisho, Addis Ababa, Nairobi iyo Jabuuti.","badge":"BILAASH","cta_label":"Bilow iibinta"},
      "am":{"title":"መኪናዎን፣ ቤትዎን ወይም መሬትዎን በነጻ ይሽጡ","subtitle":"በሁለት ደቂቃ ውስጥ ይለጥፉ እና በሀርጌሳ፣ ሞቃዲሾ፣ አዲስ አበባ፣ ናይሮቢ እና ጅቡቲ ያሉ ገዢዎችን ያግኙ።","badge":"ነጻ","cta_label":"መሸጥ ይጀምሩ"},
      "sw":{"title":"Uza Gari, Nyumba au Ardhi Yako Bure","subtitle":"Chapisha kwa dakika mbili na uwafikie wanunuzi Hargeisa, Mogadishu, Addis Ababa, Nairobi na Djibouti.","badge":"BURE","cta_label":"Anza kuuza"}}'
  ),
  (
    'The Livestock Market Is Open',
    'Camels, cattle, goats and sheep. Deal directly with herders and traders.',
    'NEW', 'See livestock', 'sun', 'livestock', 'category', 'livestock', 20,
    '{"so":{"title":"Suuqa Xoolaha Waa Furan Yahay","subtitle":"Geel, lo'', ari iyo ido. Si toos ah ula macaamil xoolo-dhaqatada iyo ganacsatada.","badge":"CUSUB","cta_label":"Eeg xoolaha"},
      "am":{"title":"የእንስሳት ገበያው ተከፍቷል","subtitle":"ግመሎች፣ ከብቶች፣ ፍየሎች እና በጎች። ከአርቢዎች እና ነጋዴዎች ጋር በቀጥታ ይገበያዩ።","badge":"አዲስ","cta_label":"እንስሳትን ይመልከቱ"},
      "sw":{"title":"Soko la Mifugo Liko Wazi","subtitle":"Ngamia, ng''ombe, mbuzi na kondoo. Fanya biashara moja kwa moja na wafugaji na wafanyabiashara.","badge":"MPYA","cta_label":"Tazama mifugo"}}'
  ),
  (
    'Houses for Rent and Sale',
    'Find a home in your city: apartments, villas and family houses.',
    'HOT', 'Find a home', 'navy', 'house', 'category', 'houses', 10,
    '{"so":{"title":"Guryo Kiro iyo Iib ah","subtitle":"Ka hel guri magaaladaada: abaartamenti, fila iyo guryo qoys.","badge":"KULUL","cta_label":"Raadi guri"},
      "am":{"title":"ለኪራይ እና ለሽያጭ ቤቶች","subtitle":"በከተማዎ ቤት ያግኙ፦ አፓርትመንቶች፣ ቪላዎች እና የቤተሰብ ቤቶች።","badge":"ተፈላጊ","cta_label":"ቤት ያግኙ"},
      "sw":{"title":"Nyumba za Kupanga na Kuuza","subtitle":"Pata nyumba katika mji wako: apatimenti, villa na nyumba za familia.","badge":"MOTO","cta_label":"Tafuta nyumba"}}'
  )
) as v(title, subtitle, badge, cta_label, theme, icon, target_type, target_value, priority, translations)
where not exists (
  select 1 from public.advertisements a
  where a.placement = 'home_hero' and a.title = v.title
);
