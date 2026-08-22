/**
 * SARATHI - Multilingual Suggestion Starter Prompts & Metadata
 * 
 * Suggestions serve as editable templates/starters for citizen queries,
 * prefilling the composer without automatic submission.
 */

import { LanguageCode } from "./schemas";

export interface SuggestionItem {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}

const SUGGESTIONS_BY_LANG: Record<string, SuggestionItem[]> = {
  en: [
    {
      id: "draft_rti",
      label: "Draft an RTI",
      icon: "draw",
      prompt: "I want to file an RTI to get information about __________________.",
    },
    {
      id: "check_scheme",
      label: "Check scheme eligibility",
      icon: "fact_check",
      prompt: "I want to know whether I am eligible for __________________. My state is __________.",
    },
    {
      id: "understand_rights",
      label: "Understand my rights",
      icon: "gavel",
      prompt: "I want to understand my rights regarding __________________.",
    },
    {
      id: "landlord_deposit",
      label: "Landlord not returning deposit",
      icon: "home",
      prompt: "My landlord has not returned my security deposit. The property is in __________ and the deposit amount is __________.",
    },
    {
      id: "consumer_complaint",
      label: "File a consumer complaint",
      icon: "shopping_bag",
      prompt: "I want to file a consumer complaint because __________________.",
    },
    {
      id: "explain_notice",
      label: "Explain government notice",
      icon: "description",
      prompt: "Please explain this government notice and tell me what I need to do next: __________________.",
    },
  ],
  hi: [
    {
      id: "draft_rti",
      label: "आरटीआई ड्राफ्ट करें",
      icon: "draw",
      prompt: "मैं __________________ के बारे में जानकारी प्राप्त करने के लिए आरटीआई (RTI) दायर करना चाहता हूँ।",
    },
    {
      id: "check_scheme",
      label: "योजना पात्रता जांचें",
      icon: "fact_check",
      prompt: "मैं जानना चाहता हूँ कि क्या मैं __________________ योजना के पात्र हूँ। मेरा राज्य __________ है।",
    },
    {
      id: "understand_rights",
      label: "अपने अधिकार समझें",
      icon: "gavel",
      prompt: "मैं __________________ के संबंध में अपने वैधानिक अधिकारों और कानूनी उपायों को समझना चाहता हूँ।",
    },
    {
      id: "landlord_deposit",
      label: "मकान मालिक डिपॉजिट नहीं लौटा रहा",
      icon: "home",
      prompt: "मेरे मकान मालिक ने मेरी सिक्योरिटी डिपॉजिट वापस नहीं की है। प्रॉपर्टी __________ में है और डिपॉजिट राशि ₹__________ है।",
    },
    {
      id: "consumer_complaint",
      label: "उपभोक्ता शिकायत दर्ज करें",
      icon: "shopping_bag",
      prompt: "मैं उपभोक्ता शिकायत दर्ज करना चाहता हूँ क्योंकि __________________।",
    },
    {
      id: "explain_notice",
      label: "सरकारी नोटिस समझें",
      icon: "description",
      prompt: "कृपया इस सरकारी नोटिस को समझाइए और मुझे बताइए कि मुझे आगे क्या करना चाहिए: __________________।",
    },
  ],
  hinglish: [
    {
      id: "draft_rti",
      label: "Draft an RTI",
      icon: "draw",
      prompt: "Mujhe __________________ ke baare me statutory RTI file karke official information chahiye.",
    },
    {
      id: "check_scheme",
      label: "Check scheme eligibility",
      icon: "fact_check",
      prompt: "Mujhe check karna hai ki kya main __________________ scheme ke eligible hoon. Mera state __________ hai.",
    },
    {
      id: "understand_rights",
      label: "Understand my rights",
      icon: "gavel",
      prompt: "Mujhe __________________ ke baare me apne legal rights aur remedies samajhne hain.",
    },
    {
      id: "landlord_deposit",
      label: "Landlord not returning deposit",
      icon: "home",
      prompt: "Mere landlord ne meri security deposit wapas nahi ki hai. Property __________ me hai aur amount ₹__________ hai.",
    },
    {
      id: "consumer_complaint",
      label: "File a consumer complaint",
      icon: "shopping_bag",
      prompt: "Mujhe consumer complaint lodge karni hai kyunki __________________.",
    },
    {
      id: "explain_notice",
      label: "Explain government notice",
      icon: "description",
      prompt: "Please is government notice/challan ko explain karein aur batayein ki mujhe aage kya steps lene chahiye: __________________.",
    },
  ],
  bn: [
    {
      id: "draft_rti",
      label: "আরটিআই ড্রাফট করুন",
      icon: "draw",
      prompt: "আমি __________________ সম্পর্কে তথ্য পাওয়ার জন্য একটি আরটিআই (RTI) আবেদন করতে চাই।",
    },
    {
      id: "check_scheme",
      label: "স্কিমের যোগ্যতা যাচাই করুন",
      icon: "fact_check",
      prompt: "আমি জানতে চাই যে আমি __________________ প্রকল্পের জন্য যোগ্য কিনা। আমার রাজ্য __________।",
    },
    {
      id: "understand_rights",
      label: "আপনার অধিকার বুঝুন",
      icon: "gavel",
      prompt: "আমি __________________ সংক্রান্ত আমার আইনি অধিকার ও প্রতিকার বুঝতে চাই।",
    },
    {
      id: "landlord_deposit",
      label: "বাড়িওয়ালা ডিপোজিট ফেরত দিচ্ছে না",
      icon: "home",
      prompt: "আমার বাড়িওয়ালা সিকিউরিটি ডিপোজিট ফেরত দিচ্ছে না। সম্পত্তিটি __________ তে অবস্থিত এবং জমার পরিমাণ ₹__________।",
    },
    {
      id: "consumer_complaint",
      label: "ভোক্তা অভিযোগ দায়ের করুন",
      icon: "shopping_bag",
      prompt: "আমি একটি ভোক্তা অভিযোগ দায়ের করতে চাই কারণ __________________।",
    },
    {
      id: "explain_notice",
      label: "সরকারি নোটিশ বুঝুন",
      icon: "description",
      prompt: "দয়া করে এই সরকারি নোটিশটি ব্যাখ্যা করুন এবং বলুন এরপরে আমাকে কী করতে হবে: __________________।",
    },
  ],
  ta: [
    {
      id: "draft_rti",
      label: "RTI மனு தயார் செய்க",
      icon: "draw",
      prompt: "நான் __________________ பற்றிய தகவல்களைப் பெற தகவல் அறியும் உரிமை (RTI) மனு தாக்கல் செய்ய விரும்புகிறேன்.",
    },
    {
      id: "check_scheme",
      label: "திட்ட தகுதியை சரிபார்க்கவும்",
      icon: "fact_check",
      prompt: "நான் __________________ திட்டத்திற்கு தகுதியானவரா என்பதை அறிய விரும்புகிறேன். எனது மாநிலம் __________.",
    },
    {
      id: "understand_rights",
      label: "உங்கள் உரிமைகளைப் புரிந்து கொள்ளுங்கள்",
      icon: "gavel",
      prompt: "நான் __________________ தொடர்பான எனது சட்டப்பூர்வ உரிமைகளைப் புரிந்து கொள்ள விரும்புகிறேன்.",
    },
    {
      id: "landlord_deposit",
      label: "வீட்டு உரிமையாளர் முன்பணத்தை திருப்பித் தரவில்லை",
      icon: "home",
      prompt: "எனது வீட்டு உரிமையாளர் எனது பாதுகாப்புக் கட்டணத்தை (security deposit) திருப்பித் தரவில்லை. சொத்து __________ இல் உள்ளது மற்றும் தொகை ₹__________.",
    },
    {
      id: "consumer_complaint",
      label: "நுகர்வோர் புகார் பதிவு செய்க",
      icon: "shopping_bag",
      prompt: "நான் நுகர்வோர் புகார் அளிக்க விரும்புகிறேன், ஏனெனில் __________________.",
    },
    {
      id: "explain_notice",
      label: "அரசு அறிவிப்பை புரிந்து கொள்ளுங்கள்",
      icon: "description",
      prompt: "தயவுசெய்து இந்த அரசு அறிவிப்பை விளக்கி, அடுத்து நான் என்ன செய்ய வேண்டும் என்று கூறுங்கள்: __________________.",
    },
  ],
  te: [
    {
      id: "draft_rti",
      label: "RTI దరఖాస్తు తయారు చేయండి",
      icon: "draw",
      prompt: "నేను __________________ గురించి సమాచారం పొందడానికి ఆర్టీఐ (RTI) దాఖలు చేయాలనుకుంటున్నాను.",
    },
    {
      id: "check_scheme",
      label: "పథకం అర్హతను తనిఖీ చేయండి",
      icon: "fact_check",
      prompt: "నేను __________________ పథకానికి అర్హుడనా కాదా అని తెలుసుకోవాలనుకుంటున్నాను. నా రాష్ట్రం __________.",
    },
    {
      id: "understand_rights",
      label: "మీ హక్కులను అర్థం చేసుకోండి",
      icon: "gavel",
      prompt: "నేను __________________ కి సంబంధించిన నా చట్టపరమైన హక్కులను అర్థం చేసుకోవాలనుకుంటున్నాను.",
    },
    {
      id: "landlord_deposit",
      label: "ఇంటి యజమాని డిపాజిట్ తిరిగి ఇవ్వడం లేదు",
      icon: "home",
      prompt: "నా ఇంటి యజమాని నా సెక్యూరిటీ డిపాజిట్ తిరిగి ఇవ్వడం లేదు. ఆస్తి __________ లో ఉంది మరియు మొత్తం ₹__________.",
    },
    {
      id: "consumer_complaint",
      label: "వినియోగదారు ఫిర్యాదు చేయండి",
      icon: "shopping_bag",
      prompt: "నేను వినియోగదారుల ఫిర్యాదు దాఖలు చేయాలనుకుంటున్నాను ఎందుకంటే __________________.",
    },
    {
      id: "explain_notice",
      label: "ప్రభుత్వ నోటీసును వివరించండి",
      icon: "description",
      prompt: "దయచేసి ఈ ప్రభుత్వ నోటీసును వివరించి, తర్వాత నేను ఏమి చేయాలో చెప్పండి: __________________.",
    },
  ],
  mr: [
    {
      id: "draft_rti",
      label: "आरटीआय मसुदा तयार करा",
      icon: "draw",
      prompt: "मला __________________ बद्दल माहिती मिळवण्यासाठी माहिती अधिकारांतर्गत (RTI) अर्ज करायचा आहे.",
    },
    {
      id: "check_scheme",
      label: "योजनेची पात्रता तपासा",
      icon: "fact_check",
      prompt: "मी __________________ योजनेसाठी पात्र आहे की नाही हे मला जाणून घ्यायचे आहे. माझे राज्य __________ आहे.",
    },
    {
      id: "understand_rights",
      label: "आपले हक्क समजून घ्या",
      icon: "gavel",
      prompt: "मला __________________ संदर्भात माझे कायदेशीर हक्क आणि उपाय समजून घ्यायचे आहेत.",
    },
    {
      id: "landlord_deposit",
      label: "घरमालक अनामत रक्कम परत करत नाही",
      icon: "home",
      prompt: "माझ्या घरमालकाने माझी अनामत रक्कम (Security Deposit) परत केलेली नाही. मालमत्ता __________ येथे असून रक्कम ₹__________ आहे.",
    },
    {
      id: "consumer_complaint",
      label: "ग्राहक तक्रार दाखल करा",
      icon: "shopping_bag",
      prompt: "मला ग्राहक तक्रार दाखल करायची आहे कारण __________________।",
    },
    {
      id: "explain_notice",
      label: "सरकारी नोटीस समजून घ्या",
      icon: "description",
      prompt: "कृपया ही सरकारी नोटीस समजावून सांगा आणि मला पुढे काय करावे लागेल ते सांगा: __________________।",
    },
  ],
  kn: [
    {
      id: "draft_rti",
      label: "RTI ಕರಡು ರಚಿಸಿ",
      icon: "draw",
      prompt: "ನಾನು __________________ ಬಗ್ಗೆ ಮಾಹಿತಿ ಪಡೆಯಲು ಆರ್‌ಟಿಐ (RTI) ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಬಯಸುತ್ತೇನೆ.",
    },
    {
      id: "check_scheme",
      label: "ಯೋಜನೆಯ ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಿ",
      icon: "fact_check",
      prompt: "ನಾನು __________________ ಯೋಜನೆಗೆ ಅರ್ಹನೇ ಎಂದು ತಿಳಿಯಲು ಬಯಸುತ್ತೇನೆ. ನನ್ನ ರಾಜ್ಯ __________.",
    },
    {
      id: "understand_rights",
      label: "ನಿಮ್ಮ ಹಕ್ಕುಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ",
      icon: "gavel",
      prompt: "ನಾನು __________________ ಗೆ ಸಂಬಂಧಿಸಿದ ನನ್ನ ಕಾನೂನುಬದ್ಧ ಹಕ್ಕುಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಬಯಸುತ್ತೇನೆ.",
    },
    {
      id: "landlord_deposit",
      label: "ಮನೆ ಮಾಲೀಕರು ಠೇವಣಿ ಹಿಂತಿರುಗಿಸುತ್ತಿಲ್ಲ",
      icon: "home",
      prompt: "ನನ್ನ ಮನೆ ಮಾಲೀಕರು ನನ್ನ ಸೆಕ್ಯುರಿಟಿ ಠೇವಣಿಯನ್ನು ಹಿಂತಿರುಗಿಸಿಲ್ಲ. ಆಸ್ತಿಯು __________ ನಲ್ಲಿದೆ ಮತ್ತು ಮೊತ್ತ ₹__________.",
    },
    {
      id: "consumer_complaint",
      label: "ಗ್ರಾಹಕ ದೂರು ದಾಖಲಿಸಿ",
      icon: "shopping_bag",
      prompt: "ನಾನು ಗ್ರಾಹಕರ ದೂರನ್ನು ಸಲ್ಲಿಸಲು ಬಯಸುತ್ತೇನೆ ಏಕೆಂದರೆ __________________.",
    },
    {
      id: "explain_notice",
      label: "ಸರ್ಕಾರಿ ನೋಟಿಸ್ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ",
      icon: "description",
      prompt: "ದಯವಿಟ್ಟು ಈ ಸರ್ಕಾರಿ ನೋಟಿಸ್ ಅನ್ನು ವಿವರಿಸಿ ಮತ್ತು ಮುಂದೆ ನಾನು ಏನು ಮಾಡಬೇಕೆಂದು ತಿಳಿಸಿ: __________________.",
    },
  ],
  gu: [
    {
      id: "draft_rti",
      label: "RTI ડ્રાફ્ટ કરો",
      icon: "draw",
      prompt: "હું __________________ વિશે માહિતી મેળવવા માટે આરટીઆઈ (RTI) દાખલ કરવા માંગુ છું.",
    },
    {
      id: "check_scheme",
      label: "યોજનાની પાત્રતા ચકાસો",
      icon: "fact_check",
      prompt: "હું જાણવા માંગુ છું કે શું હું __________________ યોજના માટે પાત્ર છું. મારું રાજ્ય __________ છે.",
    },
    {
      id: "understand_rights",
      label: "તમારા અધિકારો સમજો",
      icon: "gavel",
      prompt: "હું __________________ અંગેના મારા કાનૂની અધિકારો સમજવા માંગુ છું.",
    },
    {
      id: "landlord_deposit",
      label: "મકાનમાલિક ડિપોઝિટ પાછી આપતા નથી",
      icon: "home",
      prompt: "મારા મકાનમાલિકે મારી સિક્યોરિટી ડિપોઝિટ પાછી આપી નથી. મિલકત __________ માં છે અને રકમ ₹__________ છે.",
    },
    {
      id: "consumer_complaint",
      label: "ગ્રાહક ફરિયાદ દાખલ કરો",
      icon: "shopping_bag",
      prompt: "હું ગ્રાહક ફરિયાદ દાખલ કરવા માંગુ છું કારણ કે __________________।",
    },
    {
      id: "explain_notice",
      label: "સરકારી નોટિસ સમજો",
      icon: "description",
      prompt: "કૃપા કરીને આ સરકારી નોટિસ સમજાવો અને મને કહો કે મારે આગળ શું કરવું જોઈએ: __________________।",
    },
  ],
  pa: [
    {
      id: "draft_rti",
      label: "ਆਰਟੀਆਈ ਡਰਾਫਟ ਕਰੋ",
      icon: "draw",
      prompt: "ਮੈਂ __________________ ਬਾਰੇ ਜਾਣਕਾਰੀ ਲੈਣ ਲਈ ਆਰਟੀਆਈ (RTI) ਦਾਇਰ ਕਰਨਾ ਚਾਹੁੰਦਾ ਹਾਂ।",
    },
    {
      id: "check_scheme",
      label: "ਸਕੀਮ ਦੀ ਯੋਗਤਾ ਜਾਂਚੋ",
      icon: "fact_check",
      prompt: "ਮੈਂ ਜਾਣਨਾ ਚਾਹੁੰਦਾ ਹਾਂ ਕਿ ਕੀ ਮੈਂ __________________ ਸਕੀਮ ਲਈ ਯੋਗ ਹਾਂ। ਮੇਰਾ ਰਾਜ __________ ਹੈ।",
    },
    {
      id: "understand_rights",
      label: "ਆਪਣੇ ਅਧਿਕਾਰ ਸਮਝੋ",
      icon: "gavel",
      prompt: "ਮੈਂ __________________ ਬਾਰੇ ਆਪਣੇ ਕਾਨੂੰਨੀ ਅਧਿਕਾਰਾਂ ਅਤੇ ਉਪਚਾਰਾਂ ਨੂੰ ਸਮਝਣਾ ਚਾਹੁੰਦਾ ਹਾਂ।",
    },
    {
      id: "landlord_deposit",
      label: "ਮਕਾਨ ਮਾਲਕ ਸਕਿਓਰਿਟੀ ਵਾਪਸ ਨਹੀਂ ਕਰ ਰਿਹਾ",
      icon: "home",
      prompt: "ਮੇਰੇ ਮਕਾਨ ਮਾਲਕ ਨੇ ਮੇਰੀ ਸਕਿਓਰਿਟੀ ਡਿਪਾਜ਼ਿਟ ਵਾਪਸ ਨਹੀਂ ਕੀਤੀ। ਜਾਇਦਾਦ __________ ਵਿੱਚ ਹੈ ਅਤੇ ਰਕਮ ₹__________ ਹੈ।",
    },
    {
      id: "consumer_complaint",
      label: "ਖਪਤਕਾਰ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰੋ",
      icon: "shopping_bag",
      prompt: "ਮੈਂ ਖਪਤਕਾਰ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰਨਾ ਚਾਹੁੰਦਾ ਹਾਂ ਕਿਉਂਕਿ __________________।",
    },
    {
      id: "explain_notice",
      label: "ਸਰਕਾਰੀ ਨੋਟਿਸ ਸਮਝੋ",
      icon: "description",
      prompt: "ਕਿਰਪਾ ਕਰਕੇ ਇਸ ਸਰਕਾਰੀ ਨੋਟਿਸ ਨੂੰ ਸਮਝਾਓ ਅਤੇ ਮੈਨੂੰ ਦੱਸੋ ਕਿ ਮੈਨੂੰ ਅੱਗੇ ਕੀ ਕਰਨਾ ਚਾਹੀਦਾ ਹੈ: __________________।",
    },
  ],
  ml: [
    {
      id: "draft_rti",
      label: "RTI അപേക്ഷ തയ്യാറാക്കുക",
      icon: "draw",
      prompt: "എനിക്ക് __________________ സംബന്ധിച്ച വിവരം ലഭിക്കുന്നതിനായി വിവരാവകാശ (RTI) അപേക്ഷ നൽകണം.",
    },
    {
      id: "check_scheme",
      label: "പദ്ധതി യോഗ്യത പരിശോധിക്കുക",
      icon: "fact_check",
      prompt: "ഞാൻ __________________ പദ്ധതിക്ക് അർഹനാണോ എന്ന് അറിയാൻ ആഗ്രഹിക്കുന്നു. എന്റെ സംസ്ഥാനം __________ ആണ്.",
    },
    {
      id: "understand_rights",
      label: "നിങ്ങളുടെ അവകാശങ്ങൾ മനസ്സിലാക്കുക",
      icon: "gavel",
      prompt: "എനിക്ക് __________________ സംബന്ധിച്ച എന്റെ നിയമപരമായ അവകാശങ്ങൾ മനസ്സിലാക്കണം.",
    },
    {
      id: "landlord_deposit",
      label: "വീട്ടുടമസ്ഥൻ ഡെപ്പോസിറ്റ് തിരികെ നൽകുന്നില്ല",
      icon: "home",
      prompt: "എന്റെ വീട്ടുടമസ്ഥൻ സെക്യൂരിറ്റി ഡെപ്പോസിറ്റ് തിരികെ നൽകിയിട്ടില്ല. വസ്തു __________ ലാണ്, തുക ₹__________ ആണ്.",
    },
    {
      id: "consumer_complaint",
      label: "ഉപഭോക്തൃ പരാതി നൽകുക",
      icon: "shopping_bag",
      prompt: "എനിക്ക് ഒരു ഉപഭോക്തൃ പരാതി നൽകണം, കാരണം __________________.",
    },
    {
      id: "explain_notice",
      label: "സർക്കാർ നോട്ടീസ് മനസ്സിലാക്കുക",
      icon: "description",
      prompt: "ദയവായി ഈ സർക്കാർ നോട്ടീസ് വിശദീകരിച്ച് അടുത്തതായി ഞാൻ എന്തുചെയ്യണമെന്ന് പറയുക: __________________.",
    },
  ],
  or: [
    {
      id: "draft_rti",
      label: "RTI ଡ୍ରାଫ୍ଟ କରନ୍ତୁ",
      icon: "draw",
      prompt: "ମୁଁ __________________ ବିଷୟରେ ସୂଚନା ପାଇବା ପାଇଁ RTI ଦାଖଲ କରିବାକୁ ଚାହୁଁଛି।",
    },
    {
      id: "check_scheme",
      label: "ଯୋଜନା ଯୋଗ୍ୟତା ଯାଞ୍ଚ କରନ୍ତୁ",
      icon: "fact_check",
      prompt: "ମୁଁ ଜାଣିବାକୁ ଚାହୁଁଛି କି ମୁଁ __________________ ଯୋଜନା ପାଇଁ ଯୋଗ୍ୟ କି ନୁହେଁ। ମୋ ରାଜ୍ୟ __________।",
    },
    {
      id: "understand_rights",
      label: "ଆପଣଙ୍କ ଅଧିକାର ବୁଝନ୍ତୁ",
      icon: "gavel",
      prompt: "ମୁଁ __________________ ସମ୍ବନ୍ଧରେ ମୋର ଆଇନଗତ ଅଧିକାର ବୁଝିବାକୁ ଚାହୁଁଛି।",
    },
    {
      id: "landlord_deposit",
      label: "ଘର ମାଲିକ ଡିପୋଜିଟ୍ ଫେରାଉ ନାହାନ୍ତି",
      icon: "home",
      prompt: "ମୋ ଘର ମାଲିକ ମୋର ସିକ୍ୟୁରିଟି ଡିପୋଜିଟ୍ ଫେରାଇ ନାହାଁନ୍ତି। ସମ୍ପତ୍ତି __________ ରେ ଅଛି ଏବଂ ଜମା ରାଶି ₹__________ ଅଟେ।",
    },
    {
      id: "consumer_complaint",
      label: "ଗ୍ରାହକ ଅଭିଯୋଗ ଦାଖଲ କରନ୍ତୁ",
      icon: "shopping_bag",
      prompt: "ମୁଁ ଏକ ଗ୍ରାହକ ଅଭିଯୋଗ ଦାଖଲ କରିବାକୁ ଚାହୁଁଛି କାରଣ __________________।",
    },
    {
      id: "explain_notice",
      label: "ସରକାରୀ ନୋଟିସ୍ ବୁଝନ୍ତୁ",
      icon: "description",
      prompt: "ଦୟାକରି ଏହି ସରକାରୀ ନୋଟିସ୍ ବୁଝାନ୍ତୁ ଏବଂ ପରେ ମୋତେ କ'ଣ କରିବାକୁ ହେବ କୁହନ୍ତୁ: __________________।",
    },
  ],
};

/**
 * Returns localized suggestion starter templates based on selected language code
 */
export function getSuggestionsForLanguage(langCode: LanguageCode | string): SuggestionItem[] {
  return SUGGESTIONS_BY_LANG[langCode] || SUGGESTIONS_BY_LANG["en"];
}
