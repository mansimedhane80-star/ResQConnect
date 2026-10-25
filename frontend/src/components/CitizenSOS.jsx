
import React, { useState } from "react";
import {
  MapPin, ShieldAlert, ArrowLeft, ArrowRight, Check, Users,
  HeartPulse, Utensils, House, Route, LocateFixed, Upload,
  UserRound, AlertTriangle
} from "lucide-react";
import "./CitizenSOS.css";

const languages = [
  ["en", "English"], ["hi", "हिन्दी"], ["mr", "मराठी"],
  ["ml", "മലയാളം"], ["ta", "தமிழ்"], ["gu", "ગુજરાતી"]
];

const translations = {
  en: {
    sub:"CITIZEN EMERGENCY ASSISTANCE", live:"SOS ASSISTANCE",
    back:"Back to location", exit:"Exit SOS", locationStep:"Location & details",
    reportStep:"Emergency report", step1:"STEP 01 / 02",
    heading1:"Need emergency assistance?",
    intro1:"Share a few details and allow location access so responders can identify where help is needed.",
    basic:"Your basic information", name:"Full name", namePlaceholder:"Enter your name",
    phone:"Mobile number", phonePlaceholder:"Enter contact number",
    location:"Your current location",
    locationIntro:"Allow your browser to access your device location. Your coordinates will be attached to the report.",
    detected:"Location detected", notDetected:"GPS location not detected",
    useButton:"Use the button below to request location access.",
    accuracy:"Accuracy: approximately", metres:"metres",
    detecting:"Detecting location...", refresh:"Refresh my location",
    useLocation:"Use Current Location", report:"Report an Emergency",
    privacy:"Location access is requested by your browser. You can choose whether to grant it.",
    step2:"STEP 02 / 02", heading2:"Tell us what is happening",
    intro2:"Give responders clear information about the emergency and the help required.",
    emergency:"Type of emergency", flood:"Flood", landslide:"Landslide",
    cyclone:"Cyclone", heatwave:"Heatwave", heavy_rainfall:"Heavy Rainfall",
    earthquake:"Earthquake", happening:"What is happening?",
    describe:"Describe the situation",
    descriptionPlaceholder:"Example: Flood water has entered our house and we are unable to get out...",
    describeHelp:"Mention any immediate danger, people trapped, injuries or blocked exits.",
    peopleHelp:"People needing help", numberPeople:"Number of people",
    needs:"What help do you need?", selectAll:"Select all that apply.",
    rescue:"Rescue", medical:"Medical support", food:"Food and water",
    shelter:"Shelter", road:"Road access", additional:"Additional information",
    special:"Special needs or vulnerable people (optional)",
    specialPlaceholder:"E.g. elderly person, child, person with a disability, or urgent medical needs",
    addImage:"Add an image (optional)",
    imageHelp:"Attach a photo of the situation if safe to do so.",
    selected:"Selected:", attached:"Location attached", submit:"Submit SOS",
    success:"SOS Report Saved", reference:"Incident reference", status:"Status",
    statusValue:"Open — awaiting backend integration", home:"Return to Home",
    noGeo:"Location is not supported by this browser.",
    requesting:"Requesting GPS permission...",
    locationDetected:"Your current location has been detected.",
    locationDenied:"Location access was denied or unavailable. Enable location permission and try again.",
    locationRequired:"Please detect your current location before submitting."
  },
  hi: {
    sub:"नागरिक आपातकालीन सहायता",live:"SOS सहायता",
    back:"स्थान पर वापस जाएँ",exit:"SOS से बाहर जाएँ",
    locationStep:"स्थान और विवरण",reportStep:"आपातकालीन रिपोर्ट",
    step1:"चरण 01 / 02",heading1:"क्या आपको आपातकालीन सहायता चाहिए?",
    intro1:"कुछ विवरण दें और स्थान की अनुमति दें, ताकि बचाव दल सहायता का स्थान पहचान सकें।",
    basic:"आपकी बुनियादी जानकारी",name:"पूरा नाम",
    namePlaceholder:"अपना नाम दर्ज करें",phone:"मोबाइल नंबर",
    phonePlaceholder:"संपर्क नंबर दर्ज करें",location:"आपका वर्तमान स्थान",
    locationIntro:"अपने ब्राउज़र को डिवाइस का स्थान देखने की अनुमति दें। निर्देशांक रिपोर्ट में जोड़े जाएँगे।",
    detected:"स्थान मिल गया",notDetected:"GPS स्थान नहीं मिला",
    useButton:"स्थान की अनुमति देने के लिए नीचे दिए बटन का उपयोग करें।",
    accuracy:"लगभग सटीकता",metres:"मीटर",detecting:"स्थान खोजा जा रहा है...",
    refresh:"मेरा स्थान फिर से खोजें",useLocation:"वर्तमान स्थान का उपयोग करें",
    report:"आपातकाल की रिपोर्ट करें",
    privacy:"ब्राउज़र स्थान की अनुमति माँगेगा। अनुमति देना आपके हाथ में है।",
    step2:"चरण 02 / 02",heading2:"क्या हो रहा है, बताएँ",
    intro2:"आपातकाल और आवश्यक सहायता के बारे में बचाव दल को स्पष्ट जानकारी दें।",
    emergency:"आपातकाल का प्रकार",flood:"बाढ़",landslide:"भूस्खलन",
    cyclone:"चक्रवात",heatwave:"लू",heavy_rainfall:"भारी बारिश",
    earthquake:"भूकंप",happening:"क्या हो रहा है?",describe:"स्थिति का विवरण दें",
    descriptionPlaceholder:"उदाहरण: बाढ़ का पानी घर में आ गया है और हम बाहर नहीं निकल पा रहे हैं...",
    describeHelp:"तत्काल खतरे, फँसे लोगों, चोटों या बंद निकास का उल्लेख करें।",
    peopleHelp:"सहायता की ज़रूरत वाले लोग",numberPeople:"लोगों की संख्या",
    needs:"आपको किस सहायता की ज़रूरत है?",selectAll:"लागू होने वाले सभी विकल्प चुनें।",
    rescue:"बचाव",medical:"चिकित्सा सहायता",food:"भोजन और पानी",
    shelter:"आश्रय",road:"सड़क तक पहुँच",additional:"अतिरिक्त जानकारी",
    special:"विशेष ज़रूरतें या असहाय व्यक्ति (वैकल्पिक)",
    specialPlaceholder:"जैसे बुज़ुर्ग, बच्चा, दिव्यांग व्यक्ति या तत्काल चिकित्सा आवश्यकता",
    addImage:"तस्वीर जोड़ें (वैकल्पिक)",imageHelp:"सुरक्षित हो तो स्थिति की तस्वीर जोड़ें।",
    selected:"चुनी गई फ़ाइल:",attached:"स्थान जोड़ा गया",submit:"SOS भेजें",
    success:"SOS रिपोर्ट सहेजी गई",reference:"घटना संदर्भ संख्या",status:"स्थिति",
    statusValue:"खुली — बैकएंड जोड़ना बाकी है",home:"होम पर लौटें",
    noGeo:"यह ब्राउज़र स्थान सुविधा का समर्थन नहीं करता।",
    requesting:"GPS अनुमति माँगी जा रही है...",
    locationDetected:"आपका वर्तमान स्थान मिल गया है।",
    locationDenied:"स्थान की अनुमति नहीं मिली या स्थान उपलब्ध नहीं है। अनुमति चालू करके फिर कोशिश करें।",
    locationRequired:"रिपोर्ट भेजने से पहले अपना वर्तमान स्थान खोजें।"
  },
  mr: {
    sub:"नागरिक आपत्कालीन मदत",live:"SOS मदत",
    back:"स्थानाकडे परत जा",exit:"SOS मधून बाहेर पडा",
    locationStep:"स्थान आणि तपशील",reportStep:"आपत्कालीन अहवाल",
    step1:"टप्पा 01 / 02",heading1:"तुम्हाला आपत्कालीन मदत हवी आहे का?",
    intro1:"काही तपशील द्या आणि स्थानाची परवानगी द्या, जेणेकरून बचाव पथकाला मदतीचे ठिकाण समजेल.",
    basic:"तुमची मूलभूत माहिती",name:"पूर्ण नाव",
    namePlaceholder:"तुमचे नाव लिहा",phone:"मोबाईल क्रमांक",
    phonePlaceholder:"संपर्क क्रमांक लिहा",location:"तुमचे सध्याचे स्थान",
    locationIntro:"तुमच्या ब्राउझरला डिव्हाइसचे स्थान पाहण्याची परवानगी द्या. निर्देशांक अहवालात जोडले जातील.",
    detected:"स्थान सापडले",notDetected:"GPS स्थान सापडले नाही",
    useButton:"स्थानाची परवानगी देण्यासाठी खालील बटण वापरा.",
    accuracy:"अंदाजे अचूकता",metres:"मीटर",detecting:"स्थान शोधत आहे...",
    refresh:"माझे स्थान पुन्हा शोधा",useLocation:"सध्याचे स्थान वापरा",
    report:"आपत्कालीन अहवाल द्या",
    privacy:"ब्राउझर स्थानाची परवानगी मागेल. परवानगी द्यायची की नाही हे तुम्ही ठरवू शकता.",
    step2:"टप्पा 02 / 02",heading2:"काय घडत आहे ते सांगा",
    intro2:"आपत्कालीन परिस्थिती आणि आवश्यक मदतीची स्पष्ट माहिती बचाव पथकाला द्या.",
    emergency:"आपत्कालीन प्रकार",flood:"पूर",landslide:"भूस्खलन",
    cyclone:"चक्रीवादळ",heatwave:"उष्णतेची लाट",heavy_rainfall:"मुसळधार पाऊस",
    earthquake:"भूकंप",happening:"काय घडत आहे?",describe:"परिस्थितीचे वर्णन करा",
    descriptionPlaceholder:"उदा. पुराचे पाणी घरात आले आहे आणि आम्हाला बाहेर पडता येत नाही...",
    describeHelp:"तातडीचा धोका, अडकलेले लोक, दुखापती किंवा बंद मार्ग यांचा उल्लेख करा.",
    peopleHelp:"मदतीची गरज असलेले लोक",numberPeople:"लोकांची संख्या",
    needs:"तुम्हाला कोणती मदत हवी आहे?",selectAll:"लागू असलेले सर्व पर्याय निवडा.",
    rescue:"बचाव",medical:"वैद्यकीय मदत",food:"अन्न आणि पाणी",
    shelter:"निवारा",road:"रस्त्यापर्यंत प्रवेश",additional:"अतिरिक्त माहिती",
    special:"विशेष गरजा किंवा असुरक्षित व्यक्ती (ऐच्छिक)",
    specialPlaceholder:"उदा. ज्येष्ठ नागरिक, लहान मूल, दिव्यांग व्यक्ती किंवा तातडीची वैद्यकीय गरज",
    addImage:"फोटो जोडा (ऐच्छिक)",imageHelp:"सुरक्षित असल्यास परिस्थितीचा फोटो जोडा.",
    selected:"निवडलेली फाइल:",attached:"स्थान जोडले आहे",submit:"SOS पाठवा",
    success:"SOS अहवाल जतन झाला",reference:"घटनेचा संदर्भ क्रमांक",status:"स्थिती",
    statusValue:"खुला — बॅकएंड जोडणे बाकी आहे",home:"मुख्यपृष्ठावर परत जा",
    noGeo:"हा ब्राउझर स्थान सुविधेला समर्थन देत नाही.",
    requesting:"GPS परवानगी मागितली जात आहे...",
    locationDetected:"तुमचे सध्याचे स्थान सापडले आहे.",
    locationDenied:"स्थानाची परवानगी नाकारली गेली किंवा स्थान उपलब्ध नाही. परवानगी सुरू करून पुन्हा प्रयत्न करा.",
    locationRequired:"अहवाल पाठवण्यापूर्वी तुमचे सध्याचे स्थान शोधा."
  },
  ml: {
    sub:"പൗര അടിയന്തര സഹായം",live:"SOS സഹായം",
    back:"സ്ഥാനത്തേക്ക് മടങ്ങുക",exit:"SOS വിടുക",
    locationStep:"സ്ഥാനവും വിവരങ്ങളും",reportStep:"അടിയന്തര റിപ്പോർട്ട്",
    step1:"ഘട്ടം 01 / 02",heading1:"അടിയന്തര സഹായം ആവശ്യമുണ്ടോ?",
    intro1:"ചില വിവരങ്ങൾ നൽകുകയും ലൊക്കേഷൻ അനുമതി നൽകുകയും ചെയ്യുക; സഹായം ആവശ്യമുള്ള സ്ഥലം രക്ഷാപ്രവർത്തകർക്ക് കണ്ടെത്താം.",
    basic:"നിങ്ങളുടെ അടിസ്ഥാന വിവരങ്ങൾ",name:"പൂർണ്ണ പേര്",
    namePlaceholder:"നിങ്ങളുടെ പേര് നൽകുക",phone:"മൊബൈൽ നമ്പർ",
    phonePlaceholder:"ബന്ധപ്പെടാനുള്ള നമ്പർ നൽകുക",location:"നിങ്ങളുടെ നിലവിലെ സ്ഥലം",
    locationIntro:"നിങ്ങളുടെ ഉപകരണത്തിന്റെ സ്ഥാനം അറിയാൻ ബ്രൗസറിനെ അനുവദിക്കുക. കോർഡിനേറ്റുകൾ റിപ്പോർട്ടിൽ ചേർക്കും.",
    detected:"സ്ഥാനം കണ്ടെത്തി",notDetected:"GPS സ്ഥാനം കണ്ടെത്തിയില്ല",
    useButton:"ലൊക്കേഷൻ അനുമതി അഭ്യർത്ഥിക്കാൻ താഴെയുള്ള ബട്ടൺ ഉപയോഗിക്കുക.",
    accuracy:"ഏകദേശ കൃത്യത",metres:"മീറ്റർ",detecting:"സ്ഥാനം കണ്ടെത്തുന്നു...",
    refresh:"എന്റെ സ്ഥാനം പുതുക്കുക",useLocation:"നിലവിലെ സ്ഥാനം ഉപയോഗിക്കുക",
    report:"അടിയന്തരാവസ്ഥ റിപ്പോർട്ട് ചെയ്യുക",
    privacy:"ബ്രൗസർ ലൊക്കേഷൻ അനുമതി ചോദിക്കും. അനുമതി നൽകണോ എന്ന് നിങ്ങൾക്ക് തീരുമാനിക്കാം.",
    step2:"ഘട്ടം 02 / 02",heading2:"എന്താണ് സംഭവിക്കുന്നത് എന്ന് പറയുക",
    intro2:"അടിയന്തരാവസ്ഥയെയും ആവശ്യമായ സഹായത്തെയും കുറിച്ച് വ്യക്തമായ വിവരങ്ങൾ നൽകുക.",
    emergency:"അടിയന്തരാവസ്ഥയുടെ തരം",flood:"വെള്ളപ്പൊക്കം",landslide:"മണ്ണിടിച്ചിൽ",
    cyclone:"ചുഴലിക്കാറ്റ്",heatwave:"ഉഷ്ണതരംഗം",heavy_rainfall:"കനത്ത മഴ",
    earthquake:"ഭൂകമ്പം",happening:"എന്താണ് സംഭവിക്കുന്നത്?",describe:"സ്ഥിതി വിവരിക്കുക",
    descriptionPlaceholder:"ഉദാഹരണം: വെള്ളപ്പൊക്കം കാരണം വീട്ടിൽ വെള്ളം കയറി, പുറത്തേക്ക് പോകാൻ കഴിയുന്നില്ല...",
    describeHelp:"ഉടൻ നേരിടുന്ന അപകടം, കുടുങ്ങിയവർ, പരിക്കുകൾ, തടസ്സപ്പെട്ട വഴികൾ എന്നിവ പറയുക.",
    peopleHelp:"സഹായം ആവശ്യമുള്ളവർ",numberPeople:"ആളുകളുടെ എണ്ണം",
    needs:"എന്ത് സഹായമാണ് വേണ്ടത്?",selectAll:"ബാധകമായ എല്ലാ ഓപ്ഷനുകളും തിരഞ്ഞെടുക്കുക.",
    rescue:"രക്ഷാപ്രവർത്തനം",medical:"വൈദ്യസഹായം",food:"ഭക്ഷണവും വെള്ളവും",
    shelter:"അഭയം",road:"റോഡ് പ്രവേശനം",additional:"കൂടുതൽ വിവരങ്ങൾ",
    special:"പ്രത്യേക ആവശ്യങ്ങളുള്ളവർ അല്ലെങ്കിൽ ദുർബലരായവർ (ഐച്ഛികം)",
    specialPlaceholder:"ഉദാ. വയോധികൻ, കുട്ടി, ഭിന്നശേഷിക്കാരൻ, അടിയന്തര വൈദ്യസഹായം",
    addImage:"ചിത്രം ചേർക്കുക (ഐച്ഛികം)",imageHelp:"സുരക്ഷിതമാണെങ്കിൽ സംഭവത്തിന്റെ ചിത്രം ചേർക്കുക.",
    selected:"തിരഞ്ഞെടുത്തത്:",attached:"സ്ഥാനം ചേർത്തു",submit:"SOS സമർപ്പിക്കുക",
    success:"SOS റിപ്പോർട്ട് സംരക്ഷിച്ചു",reference:"സംഭവ റഫറൻസ്",status:"നില",
    statusValue:"തുറന്നിരിക്കുന്നു — ബാക്ക്എൻഡ് ബന്ധിപ്പിക്കാനുണ്ട്",home:"ഹോമിലേക്ക് മടങ്ങുക",
    noGeo:"ഈ ബ്രൗസറിൽ ലൊക്കേഷൻ പിന്തുണയില്ല.",
    requesting:"GPS അനുമതി അഭ്യർത്ഥിക്കുന്നു...",
    locationDetected:"നിങ്ങളുടെ നിലവിലെ സ്ഥാനം കണ്ടെത്തി.",
    locationDenied:"ലൊക്കേഷൻ അനുമതി ലഭിച്ചില്ല അല്ലെങ്കിൽ സ്ഥാനം ലഭ്യമല്ല. അനുമതി പ്രവർത്തനക്ഷമമാക്കി വീണ്ടും ശ്രമിക്കുക.",
    locationRequired:"റിപ്പോർട്ട് സമർപ്പിക്കുന്നതിന് മുമ്പ് നിങ്ങളുടെ സ്ഥാനം കണ്ടെത്തുക."
  },
  ta: {
    sub:"குடிமக்கள் அவசர உதவி",live:"SOS உதவி",
    back:"இருப்பிடத்திற்குத் திரும்பு",exit:"SOS-இலிருந்து வெளியேறு",
    locationStep:"இருப்பிடம் மற்றும் விவரங்கள்",reportStep:"அவசர அறிக்கை",
    step1:"படி 01 / 02",heading1:"அவசர உதவி தேவையா?",
    intro1:"சில விவரங்களைப் பகிர்ந்து இருப்பிட அனுமதியை வழங்குங்கள். உதவி தேவைப்படும் இடத்தை மீட்புக் குழுவினர் கண்டறிய முடியும்.",
    basic:"உங்கள் அடிப்படைத் தகவல்",name:"முழுப் பெயர்",
    namePlaceholder:"உங்கள் பெயரை உள்ளிடவும்",phone:"கைபேசி எண்",
    phonePlaceholder:"தொடர்பு எண்ணை உள்ளிடவும்",location:"உங்கள் தற்போதைய இருப்பிடம்",
    locationIntro:"உங்கள் சாதனத்தின் இருப்பிடத்தை அணுக உலாவியை அனுமதிக்கவும். ஆயத்தொலைவுகள் அறிக்கையில் சேர்க்கப்படும்.",
    detected:"இருப்பிடம் கண்டறியப்பட்டது",notDetected:"GPS இருப்பிடம் கண்டறியப்படவில்லை",
    useButton:"இருப்பிட அனுமதியைக் கோர கீழே உள்ள பொத்தானைப் பயன்படுத்தவும்.",
    accuracy:"தோராயமான துல்லியம்",metres:"மீட்டர்",detecting:"இருப்பிடம் கண்டறியப்படுகிறது...",
    refresh:"எனது இருப்பிடத்தைப் புதுப்பி",useLocation:"தற்போதைய இருப்பிடத்தைப் பயன்படுத்து",
    report:"அவசரநிலையைப் புகாரளி",
    privacy:"உலாவி இருப்பிட அனுமதியைக் கேட்கும். அனுமதி வழங்குவது உங்கள் விருப்பம்.",
    step2:"படி 02 / 02",heading2:"என்ன நடக்கிறது என்று தெரிவிக்கவும்",
    intro2:"அவசரநிலை மற்றும் தேவையான உதவி குறித்து மீட்புக் குழுவினருக்குத் தெளிவாகத் தெரிவிக்கவும்.",
    emergency:"அவசரநிலை வகை",flood:"வெள்ளம்",landslide:"நிலச்சரிவு",
    cyclone:"புயல்",heatwave:"வெப்ப அலை",heavy_rainfall:"கனமழை",
    earthquake:"நிலநடுக்கம்",happening:"என்ன நடக்கிறது?",describe:"நிலையை விவரிக்கவும்",
    descriptionPlaceholder:"எடுத்துக்காட்டு: வெள்ளநீர் வீட்டிற்குள் வந்துவிட்டது; எங்களால் வெளியேற முடியவில்லை...",
    describeHelp:"உடனடி ஆபத்து, சிக்கியவர்கள், காயங்கள் அல்லது அடைக்கப்பட்ட வழிகளை குறிப்பிடவும்.",
    peopleHelp:"உதவி தேவைப்படுவோர்",numberPeople:"நபர்களின் எண்ணிக்கை",
    needs:"உங்களுக்கு என்ன உதவி தேவை?",selectAll:"பொருந்தும் அனைத்தையும் தேர்ந்தெடுக்கவும்.",
    rescue:"மீட்பு",medical:"மருத்துவ உதவி",food:"உணவு மற்றும் தண்ணீர்",
    shelter:"தங்குமிடம்",road:"சாலை அணுகல்",additional:"கூடுதல் தகவல்",
    special:"சிறப்புத் தேவைகள் அல்லது பாதிக்கப்படக்கூடியவர்கள் (விருப்பம்)",
    specialPlaceholder:"எ.கா. முதியவர், குழந்தை, மாற்றுத்திறனாளி அல்லது அவசர மருத்துவத் தேவை",
    addImage:"படத்தைச் சேர்க்கவும் (விருப்பம்)",imageHelp:"பாதுகாப்பாக இருந்தால் நிலையின் புகைப்படத்தை இணைக்கவும்.",
    selected:"தேர்ந்தெடுக்கப்பட்டது:",attached:"இருப்பிடம் இணைக்கப்பட்டது",submit:"SOS சமர்ப்பிக்கவும்",
    success:"SOS அறிக்கை சேமிக்கப்பட்டது",reference:"சம்பவக் குறிப்பு எண்",status:"நிலை",
    statusValue:"திறந்துள்ளது — பின்புற அமைப்பு இணைக்கப்பட வேண்டும்",home:"முகப்புக்குத் திரும்பு",
    noGeo:"இந்த உலாவியில் இருப்பிட வசதி ஆதரிக்கப்படவில்லை.",
    requesting:"GPS அனுமதி கோரப்படுகிறது...",
    locationDetected:"உங்கள் தற்போதைய இருப்பிடம் கண்டறியப்பட்டது.",
    locationDenied:"இருப்பிட அனுமதி மறுக்கப்பட்டது அல்லது இருப்பிடம் கிடைக்கவில்லை. அனுமதியை இயக்கி மீண்டும் முயற்சிக்கவும்.",
    locationRequired:"அறிக்கையைச் சமர்ப்பிக்கும் முன் உங்கள் இருப்பிடத்தைக் கண்டறியவும்."
  },
  gu: {
    sub:"નાગરિક કટોકટી સહાય",live:"SOS સહાય",
    back:"સ્થાન પર પાછા જાઓ",exit:"SOS માંથી બહાર નીકળો",
    locationStep:"સ્થાન અને વિગતો",reportStep:"કટોકટી અહેવાલ",
    step1:"પગલું 01 / 02",heading1:"શું તમને કટોકટીમાં મદદ જોઈએ છે?",
    intro1:"થોડી વિગતો આપો અને સ્થાનની મંજૂરી આપો, જેથી બચાવકર્મીઓ મદદની જરૂરિયાતનું સ્થળ શોધી શકે.",
    basic:"તમારી મૂળભૂત માહિતી",name:"પૂરું નામ",
    namePlaceholder:"તમારું નામ દાખલ કરો",phone:"મોબાઇલ નંબર",
    phonePlaceholder:"સંપર્ક નંબર દાખલ કરો",location:"તમારું વર્તમાન સ્થાન",
    locationIntro:"તમારા ઉપકરણનું સ્થાન મેળવવા બ્રાઉઝરને મંજૂરી આપો. કોઓર્ડિનેટ્સ અહેવાલમાં જોડાશે.",
    detected:"સ્થાન મળી ગયું",notDetected:"GPS સ્થાન મળ્યું નથી",
    useButton:"સ્થાનની મંજૂરી મેળવવા નીચેનું બટન વાપરો.",
    accuracy:"અંદાજિત ચોકસાઈ",metres:"મીટર",detecting:"સ્થાન શોધી રહ્યા છીએ...",
    refresh:"મારું સ્થાન ફરી શોધો",useLocation:"વર્તમાન સ્થાન વાપરો",
    report:"કટોકટીની જાણ કરો",
    privacy:"બ્રાઉઝર સ્થાનની મંજૂરી માંગશે. મંજૂરી આપવી કે નહીં તે તમે નક્કી કરી શકો છો.",
    step2:"પગલું 02 / 02",heading2:"શું થઈ રહ્યું છે તે જણાવો",
    intro2:"કટોકટી અને જરૂરી મદદ વિશે બચાવકર્મીઓને સ્પષ્ટ માહિતી આપો.",
    emergency:"કટોકટીનો પ્રકાર",flood:"પૂર",landslide:"ભૂસ્ખલન",
    cyclone:"વાવાઝોડું",heatwave:"ગરમીની લહેર",heavy_rainfall:"ભારે વરસાદ",
    earthquake:"ભૂકંપ",happening:"શું થઈ રહ્યું છે?",describe:"પરિસ્થિતિનું વર્ણન કરો",
    descriptionPlaceholder:"ઉદાહરણ: પૂરનું પાણી ઘરમાં આવી ગયું છે અને અમે બહાર નીકળી શકતા નથી...",
    describeHelp:"તાત્કાલિક જોખમ, ફસાયેલા લોકો, ઇજાઓ અથવા બંધ રસ્તાઓનો ઉલ્લેખ કરો.",
    peopleHelp:"મદદની જરૂર હોય તેવા લોકો",numberPeople:"લોકોની સંખ્યા",
    needs:"તમને કઈ મદદ જોઈએ છે?",selectAll:"લાગુ પડતા બધા વિકલ્પો પસંદ કરો.",
    rescue:"બચાવ",medical:"તબીબી સહાય",food:"ખોરાક અને પાણી",
    shelter:"આશ્રય",road:"રસ્તા સુધી પહોંચ",additional:"વધારાની માહિતી",
    special:"વિશેષ જરૂરિયાતો અથવા સંવેદનશીલ લોકો (વૈકલ્પિક)",
    specialPlaceholder:"દા.ત. વૃદ્ધ વ્યક્તિ, બાળક, દિવ્યાંગ વ્યક્તિ અથવા તાત્કાલિક તબીબી જરૂરિયાત",
    addImage:"ચિત્ર ઉમેરો (વૈકલ્પિક)",imageHelp:"સલામત હોય તો પરિસ્થિતિનો ફોટો જોડો.",
    selected:"પસંદ કરેલી ફાઇલ:",attached:"સ્થાન જોડાયું",submit:"SOS મોકલો",
    success:"SOS અહેવાલ સાચવાયો",reference:"ઘટનાનો સંદર્ભ નંબર",status:"સ્થિતિ",
    statusValue:"ખુલ્લી — બેકએન્ડ જોડવાનું બાકી છે",home:"મુખ્ય પૃષ્ઠ પર પાછા જાઓ",
    noGeo:"આ બ્રાઉઝર સ્થાન સુવિધાને સપોર્ટ કરતું નથી.",
    requesting:"GPS મંજૂરી માંગી રહ્યા છીએ...",
    locationDetected:"તમારું વર્તમાન સ્થાન મળી ગયું છે.",
    locationDenied:"સ્થાનની મંજૂરી નકારી દેવામાં આવી અથવા સ્થાન ઉપલબ્ધ નથી. મંજૂરી ચાલુ કરીને ફરી પ્રયાસ કરો.",
    locationRequired:"અહેવાલ મોકલતા પહેલાં તમારું વર્તમાન સ્થાન શોધો."
  }
};

const disasterTypes = [
  "flood", "landslide", "cyclone", "heatwave", "heavy_rainfall", "earthquake"
];

const helpOptions = [
  { id:"rescue", icon:Users },
  { id:"medical", icon:HeartPulse },
  { id:"food", icon:Utensils },
  { id:"shelter", icon:House },
  { id:"road", icon:Route }
];

export default function CitizenSOS({ onBack, language = "en", setLanguage }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);
  const [disaster, setDisaster] = useState("");
  const [description, setDescription] = useState("");
  const [people, setPeople] = useState("1");
  const [needs, setNeeds] = useState([]);
  const [specialNeeds, setSpecialNeeds] = useState("");
  const [image, setImage] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [incidentId, setIncidentId] = useState("");

  const t = translations[language] || translations.en;

  function getLocation() {
    if (!navigator.geolocation) {
      setLocationMessage(t.noGeo);
      return;
    }

    setGettingLocation(true);
    setLocationMessage(t.requesting);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setLocationMessage(t.locationDetected);
        setGettingLocation(false);
      },
      () => {
        setLocationMessage(t.locationDenied);
        setGettingLocation(false);
      },
      { enableHighAccuracy:true, timeout:15000, maximumAge:0 }
    );
  }

  function toggleNeed(id) {
    setNeeds(current =>
      current.includes(id)
        ? current.filter(item => item !== id)
        : [...current, id]
    );
  }

  function submitSOS(event) {
    event.preventDefault();

    if (!location) {
      setStep(1);
      setLocationMessage(t.locationRequired);
      return;
    }

    const id = "RQ" + Date.now().toString().slice(-6);
    const report = {
      incidentId:id,
      name,
      phone,
      location,
      disasterType:disaster,
      description,
      people:Number(people),
      requiredHelp:needs,
      specialNeeds,
      imageName:image?.name || null,
      status:"Open",
      createdAt:new Date().toISOString(),
      mode:"LIVE"
    };

    const existingReports = JSON.parse(
      localStorage.getItem("resqCitizenReports") || "[]"
    );

    localStorage.setItem(
      "resqCitizenReports",
      JSON.stringify([...existingReports, report])
    );

    setIncidentId(id);
    setSubmitted(true);
  }

  return (
    <main className="citizen-sos-page">
      <header className="sos-header">
        <button
          type="button"
          className="sos-back-button"
          onClick={() => {
            if (submitted) onBack();
            else if (step === 2) setStep(1);
            else onBack();
          }}
        >
          <ArrowLeft size={18} />
          {submitted ? t.home : step === 2 ? t.back : t.exit}
        </button>

        <div className="sos-brand">
          <span className="sos-brand-icon"><ShieldAlert size={25} /></span>
          <div>
            <strong>ResQConnect</strong>
            <span>{t.sub}</span>
          </div>
        </div>

        <div className="sos-header-right">
          <label className="sos-language-selector">
            <span aria-hidden="true">🌐</span>
            <select
              aria-label="Select language"
              value={language}
              onChange={event => setLanguage?.(event.target.value)}
            >
              {languages.map(([code, label]) => (
                <option value={code} key={code}>{label}</option>
              ))}
            </select>
          </label>
          <span className="sos-live-label"><span /> {t.live}</span>
        </div>
      </header>

      {submitted ? (
        <section className="sos-success-card">
          <div className="sos-success-icon"><Check size={42} /></div>
          <p className="sos-eyebrow">RESQCONNECT • CITIZEN SOS</p>
          <h1>{t.success}</h1>
          <div className="sos-incident-number">
            <span>{t.reference}</span>
            <strong>{incidentId}</strong>
          </div>
          <div className="sos-status-row">
            <span>{t.status}</span>
            <strong>{t.statusValue}</strong>
          </div>
          <button className="sos-primary-button" onClick={onBack}>{t.home}</button>
        </section>
      ) : (
        <>
          <div className="sos-progress">
            <div className={step === 1 ? "active" : "complete"}>
              <span>1</span> {t.locationStep}
            </div>
            <div className="sos-progress-line" />
            <div className={step === 2 ? "active" : ""}>
              <span>2</span> {t.reportStep}
            </div>
          </div>

          {step === 1 ? (
            <section className="sos-content">
              <div className="sos-heading">
                <span className="sos-section-tag">{t.step1}</span>
                <h1>{t.heading1}</h1>
                <p>{t.intro1}</p>
              </div>

              <section className="sos-panel">
                <h2><UserRound size={21} /> {t.basic}</h2>
                <div className="sos-form-grid">
                  <label className="sos-field">
                    {t.name}
                    <input value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={t.namePlaceholder}
                      autoComplete="name" required />
                  </label>
                  <label className="sos-field">
                    {t.phone}
                    <input type="tel" value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder={t.phonePlaceholder}
                      autoComplete="tel" required />
                  </label>
                </div>
              </section>

              <section className="sos-panel">
                <h2><MapPin size={21} /> {t.location}</h2>
                <p className="sos-panel-description">{t.locationIntro}</p>
                <div className={`sos-location-box ${location ? "location-found" : ""}`}>
                  <span className="sos-location-icon">
                    {location ? <Check size={24} /> : <LocateFixed size={24} />}
                  </span>
                  <div>
                    <strong>{location ? t.detected : t.notDetected}</strong>
                    <p>
                      {location
                        ? `Latitude: ${location.latitude.toFixed(5)}, Longitude: ${location.longitude.toFixed(5)}`
                        : t.useButton}
                    </p>
                    {location && (
                      <small>{t.accuracy} {Math.round(location.accuracy)} {t.metres}</small>
                    )}
                  </div>
                </div>

                <button type="button" className="sos-location-button"
                  onClick={getLocation} disabled={gettingLocation}>
                  <MapPin size={19} />
                  {gettingLocation ? t.detecting : location ? t.refresh : t.useLocation}
                </button>

                {locationMessage && (
                  <p className="sos-location-message" role="status">{locationMessage}</p>
                )}
              </section>

              <button className="sos-primary-button sos-report-button"
                disabled={!name.trim() || !phone.trim() || !location}
                onClick={() => setStep(2)}>
                {t.report} <ArrowRight size={20} />
              </button>
              <p className="sos-privacy-note">{t.privacy}</p>
            </section>
          ) : (
            <section className="sos-content sos-report-content">
              <div className="sos-heading">
                <span className="sos-section-tag">{t.step2}</span>
                <h1>{t.heading2}</h1>
                <p>{t.intro2}</p>
              </div>

              <form className="sos-report-form" onSubmit={submitSOS}>
                <section className="sos-panel">
                  <h2><AlertTriangle size={21} /> {t.emergency}</h2>
                  <div className="sos-disaster-grid">
                    {disasterTypes.map(type => (
                      <button type="button" key={type}
                        className={`sos-disaster-option ${disaster === type ? "selected" : ""}`}
                        onClick={() => setDisaster(type)}>
                        <span className="sos-radio-dot">
                          {disaster === type && <span />}
                        </span>
                        {t[type]}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="sos-panel">
                  <h2>{t.happening}</h2>
                  <label className="sos-field">
                    {t.describe}
                    <textarea value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder={t.descriptionPlaceholder}
                      rows={4} required />
                  </label>
                  <p className="sos-help-text">{t.describeHelp}</p>
                </section>

                <section className="sos-panel">
                  <h2><Users size={21} /> {t.peopleHelp}</h2>
                  <label className="sos-field sos-people-field">
                    {t.numberPeople}
                    <input type="number" min="1" max="1000"
                      value={people}
                      onChange={e => setPeople(e.target.value)} required />
                  </label>
                </section>

                <section className="sos-panel">
                  <h2>{t.needs}</h2>
                  <p className="sos-panel-description">{t.selectAll}</p>
                  <div className="sos-needs-grid">
                    {helpOptions.map(({ id, icon: Icon }) => (
                      <label key={id}
                        className={`sos-need-option ${needs.includes(id) ? "selected" : ""}`}>
                        <input type="checkbox"
                          checked={needs.includes(id)}
                          onChange={() => toggleNeed(id)} />
                        <span className="sos-custom-checkbox">
                          {needs.includes(id) && <Check size={15} />}
                        </span>
                        <Icon size={21} />
                        <span>{t[id]}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="sos-panel">
                  <h2>{t.additional}</h2>
                  <label className="sos-field">
                    {t.special}
                    <textarea value={specialNeeds}
                      onChange={e => setSpecialNeeds(e.target.value)}
                      placeholder={t.specialPlaceholder} rows={3} />
                  </label>

                  <label className="sos-upload">
                    <Upload size={22} />
                    <span>
                      <strong>{t.addImage}</strong>
                      <small>{t.imageHelp}</small>
                    </span>
                    <input type="file" accept="image/*"
                      onChange={e => setImage(e.target.files?.[0] || null)} />
                  </label>
                  {image && <p className="sos-help-text">{t.selected} {image.name}</p>}
                </section>

                <div className="sos-report-location">
                  <MapPin size={19} />
                  <div>
                    <strong>{t.attached}</strong>
                    <p>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</p>
                  </div>
                  <Check size={19} />
                </div>

                <button type="submit"
                  className="sos-primary-button sos-submit-button"
                  disabled={!disaster || !description.trim() || Number(people) < 1}>
                  <ShieldAlert size={21} /> {t.submit}
                </button>
              </form>
            </section>
          )}
        </>
      )}
    </main>
  );
}
