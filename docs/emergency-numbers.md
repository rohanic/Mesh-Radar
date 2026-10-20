# Emergency numbers: verification sheet

`config/emergency-numbers.json` ships every number with `verified: false` (DEC-004). A person checks each one against its source, calls the non-emergency ones where sensible, then sets `verified: true`. `npm run check:release` blocks a production build until every number is verified.

Researched on 2026-10-20 from official government or service domains, and from UK, US and Australian government travel pages. The research tool could not open pages in this environment, so every entry below rests on a search result snippet from the source domain: open each source before verifying.

## Saudi Arabia (SA)

911 is answered by unified centres reported for the Makkah, Madinah, Riyadh and Eastern regions; in other regions 999, 997 and 998 are the direct lines.

| Number | Kind | Label | Source | Evidence |
| --- | --- | --- | --- | --- |
| 911 | emergency | Unified emergency number | https://my.gov.sa/en/emergency-contact | Search snippet, page not fetched: the national platform's emergency contact list gives 'Unified Emergency Number' 911, alongside Police 999, Civil Defense 998, Ambulance 997. SPA release https://www.spa.gov.sa/en/N2525906 (Feb 2026) reports 911 calls handled for the Makkah, Madinah, Riyadh and Eastern regions. |
| 112 | emergency | Emergency without a Saudi SIM card | https://my.gov.sa/en/emergency-contact | Search snippet, page not fetched: 'Kingdom Emergency (without the SIM card)' 112. GOV.UK Saudi Arabia getting help page snippet also says: 'If you do not have a Saudi SIM card, call 112 in an emergency.' |
| 999 | police | Police | https://my.gov.sa/en/emergency-contact | Search snippet, page not fetched: 'Civil Defense 998, Police 999, Ambulance 997'. The CST National Numbering Plan (https://www.cst.gov.sa/en/about/Numbering) snippet also lists '999 Police'. |
| 997 | ambulance | Saudi Red Crescent (ambulance) | https://my.gov.sa/en/emergency-contact | Search snippet, page not fetched: 'Ambulance 997'. The Ministry of Interior useful contacts snippet lists 'Red Crescent 997'. |
| 998 | fire | Civil Defense (fire, rescue, disasters) | https://my.gov.sa/en/emergency-contact | Search snippet, page not fetched: 'Civil Defense 998'. CST National Numbering Plan snippet: '998 Civil Defense'. |
| 116111 | child | Child helpline (National Family Safety Program) | https://my.gov.sa/en/content/human-rights | Search snippet, page not fetched: the child support hotline (116111) offers free counseling to children and their caregivers and refers cases needing intervention to child care authorities. CST numbering plan snippet lists 116111 as the Family Safety Program child helpline. |

## Iraq (IQ)

911 is the unified number for federal Iraq, run from a Baghdad centre since 2025; in the Kurdistan Region the regional government lists its own police, ambulance and civil defence lines, and 911 is not confirmed there.

| Number | Kind | Label | Source | Evidence |
| --- | --- | --- | --- | --- |
| 911 | emergency | Unified emergency number | https://pmo.iq/?article=2933 | Search snippet, page not fetched: Prime Minister's Office headline 'يفتتح مشروع رقم الطوارئ الموحد (911)' (opens the unified emergency number 911 project). U.S. Embassy security alert of 18 Oct 2026 (https://iq.usembassy.gov/security-alert-u-s-mission-iraq-october-18-2026/) gives the local emergency number as 911. |
| 104 | police | Police | https://iq.usembassy.gov/contact/ | Search snippet, page not fetched: 'Iraqi Civil Defense Hotline: 115, Ambulance: 122, Police: 104, Fire: 115'. State Department Iraq page snippet: 'Dial 104 for police'. |
| 122 | ambulance | Ambulance | https://www.gov.uk/foreign-travel-advice/iraq/getting-help | Search snippet, page not fetched: 'Ambulance: 122, Fire: 115, Police: 911'. GOV.UK Iraq health page snippet: 'Call 122 and ask for an ambulance.' |
| 115 | fire | Civil Defense (fire and rescue) | https://iq.usembassy.gov/contact/ | Search snippet, page not fetched: 'Iraqi Civil Defense Hotline: 115' and 'Fire: 115'. GOV.UK Iraq page also lists 'Fire: 115'. |

## Pakistan (PK)

Rescue 1122 is run by each province and covers Punjab and Khyber Pakhtunkhwa but only some districts elsewhere, so where it does not answer use 15, 115 or 16.

| Number | Kind | Label | Source | Evidence |
| --- | --- | --- | --- | --- |
| 1122 | rescue | Rescue 1122 (ambulance, fire, rescue) | https://www.gov.uk/foreign-travel-advice/pakistan/getting-help | Search snippet, page not fetched: lists 'Police: 15' and 1122 for 'ambulance, fire'. Sindh Rescue 1122 site (https://sers.gos.pk/) snippet: 'In an Emergency Dial-1122'; operations cover Karachi, Larkana, Thatta, Sujawal, Qambar-Shahdadkot, Badin and Hyderabad districts. |
| 15 | police | Police | https://www.gov.uk/foreign-travel-advice/pakistan/getting-help | Search snippet, page not fetched: 'Police: 15'. State Department Pakistan snippet: 'You may report crimes to the local police by dialing 15'. |
| 115 | ambulance | Ambulance | https://www.smartraveller.gov.au/destinations/asia/pakistan | Search snippet, page not fetched: 'Call 1122 or 115 for medical emergencies.' |
| 16 | fire | Fire brigade | https://www.smartraveller.gov.au/destinations/asia/pakistan | Search snippet, page not fetched: 'Call 1122 or 16 for fire and rescue.' |
| 130 | police | Motorway Police (motorways and national highways) | https://nhmp.gov.pk/ | Search snippet, page not fetched: NHMP helpline 130 is a toll free line for motorists on motorways and highways, for travel guidance, assistance or emergency support; the 2022 to 2023 yearbook says it runs round the clock. |
| 1121 | child | Child protection helpline (Punjab, Khyber Pakhtunkhwa) | https://cpwb.punjab.gov.pk/helpline | Search snippet, page not fetched: 'Child Helpline (1121) which you can call any day, any time, to report suspected maltreatment of children.' KP Child Protection and Welfare Commission (https://www.kpcpwc.gov.pk/) snippet: 'Helpline: 1121'. |
| 051111157157 | disaster | NDMA national disaster helpline | https://www.ndma.gov.pk/ | Search snippet, page not fetched: 'NDMA Emergency Helpline: 051-111-157-157, Available 24/7'. NDMA contact page snippet: 'UAN-No: 051-111-157-157'. |

## India (IN)

Ambulance services 108 and 102 are run by each state and 102 is mainly patient transport, and the 181 women helpline is listed as not running in West Bengal; dial 112 if unsure.

| Number | Kind | Label | Source | Evidence |
| --- | --- | --- | --- | --- |
| 112 | emergency | Emergency (police, fire, ambulance) | https://112.gov.in/ | Search snippet, page not fetched: 'Emergency Response Support System (ERSS) is a Pan-India single number (112) based emergency response system'; described as operational in all States/UTs. GOV.UK India snippet: 'Telephone: 112 (ambulance, fire, police)'. |
| 100 | police | Police | https://www.india.gov.in/directory/helpline | Search snippet, page not fetched: the national portal helpline directory lists '100 Police Helpline'. |
| 101 | fire | Fire | https://www.india.gov.in/directory/helpline | Search snippet, page not fetched: the national portal helpline directory lists '101 Fire Helpline'. |
| 108 | ambulance | Emergency ambulance | https://nhm.gov.in/index1.php?lang=1&level=2&sublinkid=1217&lid=189 | Search snippet, page not fetched: under the National Health Mission, Dial 108 is mainly an emergency response service for critical care, trauma and accident cases, while Dial 102 is basic patient transport for pregnant women and children. |
| 1098 | child | Child helpline | https://www.india.gov.in/directory/helpline | Search snippet, page not fetched: the helpline directory lists 1098 as the 'Child Help Line'. |
| 1363 | tourist | Tourist helpline (24 hours, many languages) | https://www.incredibleindia.gov.in/en/emergency | Search snippet, page not fetched: Incredible India emergency page lists 112 as the national emergency number and 1363 as the tourist helpline. Ministry of Tourism PIB note (https://tourism.gov.in/sites/default/files/2024-12/PIB2083793.pdf): toll free 1800-11-1363 or short code 1363, 24x7. |
| 181 | women | Women helpline | https://wcd.gov.in/women/help | Search snippet, page not fetched: the Women Helpline is reachable through a single toll free number nationwide, 181, and is 'presently operational in all States/UTs except West Bengal'. |

## Bangladesh (BD)

999 works from any phone across the country, and 1090 gives recorded warnings only, not rescue.

| Number | Kind | Label | Source | Evidence |
| --- | --- | --- | --- | --- |
| 999 | emergency | National emergency service (police, fire, ambulance) | https://www.999.gov.bd/ | Search snippet (Bengali), page not fetched: national emergency service giving police, fire service and ambulance toll free. U.S. Embassy page (https://bd.usembassy.gov/emergency-assistance/) snippet: 'Police, fire service and ambulance services will be available from any phone (mobile or fixed line) dialing the number. The 999 number is completely toll free.' |
| 102 | fire | Fire Service and Civil Defence | https://fireservice.gov.bd/ | Search snippet (Bengali), page not fetched: homepage lists 999 for emergencies, 333 for government information and 102 for the fire service. Fire Service news item headline: 'জরুরি সেবা নিতে ফায়ার সার্ভিসের হটলাইন নম্বর ১০২' (fire service hotline number 102 for emergency service). |
| 109 | women | Helpline for violence against women and children | https://dwa.gov.bd/ | Search snippet (Bengali), page not fetched: Directorate of Women Affairs says to call 109 from any number when women or children face abuse or trafficking, or it is likely ('নারী ও শিশু নির্যাতন অথবা পাচারের ঘটনা ঘটলে বা ঘটার সম্ভাবনায় যে কোন নম্বর থেকে ফোন'). Ministry notice: 'ন্যাশনাল টোলফ্রি হেল্পলাইন ১০৯'. |
| 1098 | child | Child helpline | https://dss.gov.bd/pages/static-pages/6922deb1933eb65569e1cab0 | Search snippet (Bengali), page not fetched: page title 'শিশু সহায়তায় ফোন ১০৯৮' (phone 1098 for child help); toll free, nationwide, 24 hours, run by the Department of Social Services with UNICEF support. |
| 01320222222 | tourist | Tourist Police | https://tourist.police.gov.bd/ | Search snippet, page not fetched: Tourist Police helpline 01320-222222 and 01887-878787 for Tourist Police emergency services; same numbers in the HQ Command and Control contact table. |
| 1090 | disaster | Disaster and weather warnings (recorded messages) | https://ddm.gov.bd/pages/static-pages/6922dc30933eb65569e0edd0 | Search snippet (Bengali), page not fetched: Department of Disaster Management IVR page; dial 1090 from any mobile for recorded weather advisories and disaster early warnings, 24 hours. Ministry of Disaster Management site also lists 1090 as the IVR number. |

## Indonesia (ID)

112 works only in regencies and cities whose local government has launched it, so the national numbers 110, 113, 115, 117 and 119 remain the safer choice elsewhere.

| Number | Kind | Label | Source | Evidence |
| --- | --- | --- | --- | --- |
| 112 | emergency | Emergency call centre | https://layanan112.komdigi.go.id/tentang | Search snippet, page not fetched: Call Center 112 is run by regency and city governments (DKI Jakarta by the province), free, and callable without a SIM card where there is signal. Same page says central numbers 'Kepolisian = 110, Pemadam Kebakaran = 113, Basarnas = 115, Ambulan/Kemenkes = 119, BNPB = 117' can still be used. |
| 110 | police | Police | https://humas.polri.go.id/news/detail/2209926-polri-sediakan-layanan-call-center-110-bebas-pulsa-untuk-respons-cepat-masyarakat | Search snippet, page not fetched: headline 'Polri Sediakan Layanan Call Center 110 Bebas Pulsa'; Polri states 'Layanan Contact Center 110 kini berlaku nasional dan dapat diakses gratis selama 24 jam' (nationwide, free, 24 hours). |
| 119 | ambulance | Ambulance (PSC 119) | https://kemkes.go.id/id/layanan/psc-119 | Search snippet, page not fetched: Ministry of Health PSC 119 national command centre takes calls 24 hours, free, and forwards them to the nearest regency or city PSC, or the nearest hospital where there is no PSC. |
| 113 | fire | Fire brigade | https://layanan112.komdigi.go.id/tentang | Search snippet, page not fetched: 'Pemadam Kebakaran = 113' listed among central emergency numbers that 'masih bisa digunakan' (can still be used). |
| 115 | rescue | Basarnas search and rescue | https://basarnas.go.id/berita/kabasarnas-darurat-sar-hubungi-115 | Search snippet, page not fetched: Basarnas news 'Darurat SAR, Hubungi 115'; people anywhere in Indonesia can call Basarnas on 115 when facing or witnessing an emergency, 24 hours. |
| 117 | disaster | BNPB disaster call centre | https://bnpb.go.id/berita/perkembangan-situasi-dan-penanganan-bencana-di-tanah-air-14-oktober-2026 | Search snippet, page not fetched: 14 Oct 2026 BNPB update urges residents to contact BNPB through the 117 phone line or their regional BPBD when they see fire spots or other emergencies. |
| 129 | child | SAPA 129 (violence against women and children) | https://www.kemenpppa.go.id/index.php/siaran-pers/kemenpppa-aktivasi-layanan-sapa-129-terintegrasi-serentak-di-10-provinsi | Search snippet, page not fetched: KemenPPPA pages give 'telepon hotline 129 maupun WhatsApp ke nomor 08111-129-129' for reporting violence against women and children, 24 hours, free and confidential. |

## Malaysia (MY)

999 is the main number for police, ambulance, fire and civil defence, and is free from landlines and mobiles.

| Number | Kind | Label | Source | Evidence |
| --- | --- | --- | --- | --- |
| 999 | emergency | Emergency (police, ambulance, fire, civil defence) | https://999.gov.my/mers-999/apa-itu-mers-999/ | Search snippet (Malay), page not fetched: MERS 999 merges emergency numbers into one number, 999, passing calls to Police, Fire and Rescue, hospitals, Civil Defence and the Maritime Enforcement Agency; free from landlines and mobiles. |
| 112 | emergency | Emergency from a mobile phone | https://www.gov.uk/foreign-travel-advice/malaysia/getting-help | Search snippet, page not fetched: 'Ambulance (from a mobile): 112'. MyGOV emergency numbers post (https://www.mygov.gov.my/post/nombor-kecemasan-di-malaysia) snippet: 112 can be reached from a mobile phone even without network coverage. |
| 15999 | child | Talian Kasih (abuse, women, children, family crisis) | https://www.malaysia.gov.my/en/categories/law--safety/vulnerable-groups/talian-kasih-15999 | Search snippet, page not fetched: Talian Kasih 15999 is a 24/7 emergency helpline set up by KPWKM and run by the Social Welfare Department for women, children, the elderly, disabled people and vulnerable groups facing abuse or family crises; WhatsApp 019-261 5999. |
| 0380642400 | disaster | NADMA national disaster operations room (24 hours) | https://portalbencana.nadma.gov.my/en/component/sppagebuilder/?view=page&id=4493 | Search snippet, page not fetched: the NDCC operations room at the SMART headquarters in Puchong has a 24 hour line 03-8064 2400, second number 03-8064 2429, email opsroom@nadma.gov.my. |

## Turkey (TR)

112 covers all 81 provinces, and the old numbers 155, 156, 110 and 122 still connect to the 112 centre.

| Number | Kind | Label | Source | Evidence |
| --- | --- | --- | --- | --- |
| 112 | emergency | Emergency (ambulance, fire, police, gendarmerie, disaster) | https://www.112.gov.tr/112-acm-projesi | Search snippet (Turkish), page not fetched: the single number 112 system has been in place in all 81 provinces since 2021. Ministry of Interior snippet: 112 centres now take calls that used to go to 110, 155, 156, 158, 122 and 177. |
| 155 | police | Police (connects to 112) | https://www.112.gov.tr/samsun/artik-polis-imdat-112-de | Search snippet, page not fetched: '110 İTFAİYE İMDAT, 112 SAĞLIK İMDAT, 156 JANDARMA İMDAT, 155 POLİS İMDAT ACİL ÇAĞRILARI SAMSUN 112 ACİL ÇAĞRI MERKEZİ tarafından karşılanmaktadır.' 112 FAQ (https://www.112.gov.tr/osmaniye/sikca-sorulan-sorular): the old three digit numbers are redirected and reach the centre as if 112 was dialled. |
| 156 | police | Gendarmerie, rural areas (connects to 112) | https://www.112.gov.tr/samsun/artik-polis-imdat-112-de | Search snippet, page not fetched: '156 JANDARMA İMDAT ... ACİL ÇAĞRILARI SAMSUN 112 ACİL ÇAĞRI MERKEZİ tarafından karşılanmaktadır.' |
| 110 | fire | Fire (connects to 112) | https://www.112.gov.tr/samsun/artik-polis-imdat-112-de | Search snippet, page not fetched: '110 İTFAİYE İMDAT ... ACİL ÇAĞRILARI SAMSUN 112 ACİL ÇAĞRI MERKEZİ tarafından karşılanmaktadır.' |
| 122 | disaster | AFAD disaster line (connects to 112) | https://www.112.gov.tr/samsun/artik-afad-imdat-112-de | Search snippet, page not fetched: headline 'Artık AFAD İmdat 112 de' (AFAD emergency is now at 112); integration ended with 122 AFAD in May 2021. |
| 183 | women | ALO 183 social support (violence, women, children, family) | https://alo183.aile.gov.tr/ | Search snippet (Turkish), page not fetched: Ministry of Family and Social Services call centre, 7 days 24 hours, free from within Turkey; takes urgent reports of violence and abuse and passes them to provincial teams or law enforcement. |
| 02125274503 | tourist | Istanbul Tourist Police | https://www.smartraveller.gov.au/destinations/europe/turkiye | Search snippet, page not fetched: 'In Istanbul, call the dedicated Tourist Police unit on +90 212 527 4503.' Conflict: older U.S. Embassy page (https://tr.usembassy.gov/istanbul-emergency-contact/) lists 90-505-187-6614. |

## Nepal (NP)

Ambulances are unreliable outside Kathmandu, so on treks the Tourist Police on 1144 are often the best first call.

| Number | Kind | Label | Source | Evidence |
| --- | --- | --- | --- | --- |
| 100 | police | Police | https://ntb.gov.np/plan-your-trip/before-you-come/tourist-police | Search snippet, page not fetched: 'Dial 100, Police Assistance' and 'Dial 1144, Tourist Police Toll-Free Hotline'. U.S. Embassy (https://np.usembassy.gov/emergency-assistance/): 100 is 'equivalent to 911' and 'staffed 24/7 by the local police'. |
| 102 | ambulance | Ambulance | https://www.gov.uk/foreign-travel-advice/nepal/getting-help | Search snippet, page not fetched: 'Ambulance: 102'. State Department Nepal page gives 102 for emergency medical services. |
| 101 | fire | Fire | https://travel.state.gov/content/travel/en/international-travel/International-Travel-Country-Information-Pages/Nepal.html | Search snippet, page not fetched: State Department lists 101 to report a fire and 102 for emergency medical services. |
| 1144 | tourist | Tourist Police (English spoken) | https://ntb.gov.np/plan-your-trip/before-you-come/tourist-police | Search snippet, page not fetched: '1144, Tourist Police Toll-Free Hotline' for help anywhere in the country. |
| 1234 | disaster | Government disaster and rescue hotline | https://moha.gov.np/en | Search snippet, page not fetched: 'विपद् हेल्पलाइन (२४ सै घण्टा TOLLFREE सेवा): १२३४' (disaster helpline, 24 hour toll free: 1234). NDRRMA site lists 'NEOC Toll Free: 1234'. |
| 1114 | rescue | Armed Police Force | https://np.usembassy.gov/weather-alert-u-s-embassy-kathmandu-nepal-september-24-2026/ | Search snippet, page not fetched: emergency contacts 'Nepal Police: 100, Government disaster and rescue hotline: 1234, Armed Police Force: 1114'. |
| 1098 | child | Child helpline | https://ncrc.gov.np/ | Search snippet, page not fetched: National Child Rights Council lists 'Child Helpline 1098' among its services and publishes the 2019 helpline operating procedure. |

## United Arab Emirates (AE)

999, 998 and 997 work in every emirate, while 996 is listed for sea emergencies in Abu Dhabi and the Dubai Tourist Police line covers Dubai only.

| Number | Kind | Label | Source | Evidence |
| --- | --- | --- | --- | --- |
| 999 | police | Police (use if unsure) | https://u.ae/en/information-and-services/justice-safety-and-the-law/Safety/handling-emergencies | Search snippet, page not fetched: '999 for Police, 998 for Ambulance, 997 for Fire Department (Civil Defence), 996 for Coastguard, 995 for Find and Rescue, 991 for electricity failure'; callable anywhere in the UAE. |
| 998 | ambulance | Ambulance | https://u.ae/en/information-and-services/justice-safety-and-the-law/Safety/handling-emergencies | Search snippet, page not fetched: '998 for Ambulance'. GOV.UK UAE snippet: 'Ambulance: 998, Fire: 997, Police: 999'. |
| 997 | fire | Fire (Civil Defence) | https://u.ae/en/information-and-services/justice-safety-and-the-law/Safety/handling-emergencies | Search snippet, page not fetched: '997 for Fire Department (Civil Defence)'. |
| 995 | rescue | Search and rescue | https://u.ae/en/information-and-services/justice-safety-and-the-law/Safety/handling-emergencies | Search snippet, page not fetched: '995 for Find and Rescue'. Not shown on the shorter u.ae and Ministry of Interior lists. |
| 996 | rescue | Coastguard (sea emergencies, Abu Dhabi) | https://u.ae/en/information-and-services/justice-safety-and-the-law/Safety/handling-emergencies | Search snippet, page not fetched: '996 for Coastguard'; for marine emergencies 'If you are in Abu Dhabi, call National Guard on 996', in Dubai call Dubai Coast Guard on +971 566 8243 43, in other emirates call the police on 999. |
| 116111 | child | Child Protection Centre (Ministry of Interior) | https://u.ae/en/information-and-services/justice-safety-and-the-law/Safety/children-safety | Search snippet, page not fetched: 'You can report child abuse to MoI through the hotline number 116111 or through the MoI's Child Protection Centre's website and the Hemayati app.' |
| 0504538107 | tourist | Dubai Tourist Police duty officer | https://www.dubaipolice.gov.ae/wps/portal/home/services/visitorsservices/touristpolice | Search snippet, page not fetched: '901 Call Center / 050 453 8107 Duty officer number'; incident must be in the Emirate of Dubai. Conflict: u.ae tourist page gives +97146096239 for Dubai Tourism Police. |

## Open questions

- MY: 994 (fire) is left out. GOV.UK and the US State Department list it, but the Malaysian Civil Defence page says it merged into 999 in 2007.

- Method limit: WebFetch could not reach any site in this session (DNS failure even for example.com) and direct HTTPS from the shell was refused by the proxy, so no page was opened. Every entry rests on WebSearch result snippets from the named official domain, as allowed by the brief. The search tool returns summarised snippets, so quoted text may not be word for word; each entry needs a person to open the source page.
- IQ: State Department Iraq page lists 'Dial 112 for the National Emergency Hotline'; what 112 reaches in Iraq is unclear, so it was left out.
- IQ: no current child helpline confirmed. A 2021 UNICEF statement mentions hotline 497 run by Community Police for child abuse reports; not confirmed on an Iraqi government page.
- IQ: Kurdistan Region lines not confirmed for mobiles. KRG lists police 066104, ambulance 066122 and civil defence 115; Erbil 122 is confirmed on gov.krd (https://gov.krd/dmi-en/activities/news-and-press-releases/2023/january/erbil-s-emergency-line-122-fast-and-free-help-to-all/). A 2021 KRG post mentions a 119 domestic violence hotline; currency unknown.
- IQ: GOV.UK lists 911 as 'Police' while the State Department and U.S. Embassy list 104 for police and 911 for all emergencies.
- SA: no official source found that states 911 is answered in regions outside Makkah, Madinah, Riyadh and the Eastern Region; the regional list comes from SPA monthly call reports.
- PK: Rescue 1122 coverage outside Punjab, Khyber Pakhtunkhwa and the listed Sindh districts (Balochistan, Islamabad, AJK, Gilgit-Baltistan) not confirmed on an official site; an Aug 2026 report says Islamabad's service was still not fully operational.
- PK: 115 is listed by Smartraveller only, with no operator named (commonly the Edhi Foundation, not confirmed here). Sindh child helpline 021-99205892 seen only in a referral directory, not included.
- IN: national disaster line conflict. MHA NDM India contact page lists 1078 for the National Emergency Response Centre; the NDMA Emergency Operations Center page gives 011-1070 for the same centre. NDMA control room is +91-11-26701728. None included.
- IN: Incredible India emergency page lists 102 for ambulance and 108 for 'Disaster management'; NHM says 108 is the emergency ambulance and 102 is patient transport.
- BD: Fire Service site also carries an older news item announcing hotline 16163; press reports said 16163 would close after 31 Dec 2024 and 102 would remain. Only 102 included.
- BD: Tourist Police site header also shows 01320 163 599; the second helpline 01887-878787 is not included as a separate entry.
- MY: GOV.UK and State Department list 994 for fire, but the Civil Defence page says 994 was merged into 999 in 2007. Kept 994 with this conflict noted; dial 999 first.
- MY: no national tourist police hotline found. A Tourism Malaysia brochure lists Kuala Lumpur Tourist Police +603 2163 4422 but the page is about 585 days old; not included.
- TR: Istanbul Tourist Police numbers differ between Smartraveller (+90 212 527 4503) and an older U.S. Embassy page (90-505-187-6614).
- AE: Dubai Tourist Police number differs between Dubai Police (050 453 8107 duty officer) and u.ae (+97146096239). NCEMA lists only an HQ switchboard (02 4177000), no public disaster hotline, so none included. Whether 112 works in the UAE was not confirmed.
- NP: women helpline (National Women Commission) and 1155 weather and flood information line not included; 1155 appears only in a U.S. Embassy alert.
