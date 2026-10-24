# Urdu safety text: review

These are the words a person reads in an emergency: SOS, alerts, quick replies, emergency numbers and notifications. They were machine-drafted. Before the production release, a native Urdu reader checks each line (DEC-050).

**How to review**

1. Read the Urdu next to the English. Is it correct, natural and calm? Would an elder understand it at once?
2. Write any correction in the "Fix" column, or send the line number and the better Urdu in chat.
3. Words in `{{double braces}}` are filled in by the app (a name, a distance); keep them exactly as they are.
4. When every line is right, say "Urdu approved". Claude then marks Urdu reviewed in `src/i18n/status.json` with your name and the date, and the production build can run.

182 lines in 15 groups.

## Emergency card

| # | English | Urdu | Fix |
| --- | --- | --- | --- |
| 1 | Emergency card | ایمرجنسی کارڈ |  |
| 2 | Name on the card | کارڈ پر نام |  |
| 3 | Blood group | بلڈ گروپ |  |
| 4 | Medical conditions | بیماریاں |  |
| 5 | Medicines | دوائیں |  |
| 6 | Home contact name | گھر پر رابطے کا نام |  |
| 7 | Home contact phone | گھر پر رابطے کا فون نمبر |  |
| 8 | Hotel, tent or camp number | ہوٹل، خیمہ یا کیمپ نمبر |  |
| 9 | Show on lock screen | لاک اسکرین پر دکھائیں |  |
| 10 | Anyone holding your phone can read this card without unlocking it. | جس کے ہاتھ میں بھی آپ کا فون ہو، وہ اسے کھولے بغیر یہ کارڈ پڑھ سکتا ہے۔ |  |
| 11 | Not filled in yet | ابھی نہیں بھرا گیا |  |

## Find mode

| # | English | Urdu | Fix |
| --- | --- | --- | --- |
| 12 | Finding {{name}} | {{name}} کو ڈھونڈ رہے ہیں |  |
| 13 | You are together | آپ ساتھ ہیں |  |
| 14 | Less than 10 metres. Look around and wave. | 10 میٹر سے کم۔ ادھر ادھر دیکھیں اور ہاتھ ہلائیں۔ |  |
| 15 | Walk in the direction of the arrow. | تیر کی سمت میں چلیں۔ |  |
| 16 | Position is {{time}} old. They may have moved. | یہ جگہ {{time}} پرانی ہے۔ ہو سکتا ہے وہ کہیں اور چلے گئے ہوں۔ |  |
| 17 | Fine find | درست تلاش |  |
| 18 | Ultra-wideband: {{distance}} | UWB: {{distance}} |  |
| 19 | Screen is at full brightness for sunlight. | دھوپ کے لیے اسکرین پوری روشن کر دی گئی ہے۔ |  |
| 20 | End | ختم کریں |  |

## Quick replies

| # | English | Urdu | Fix |
| --- | --- | --- | --- |
| 21 | I'm OK | میں ٹھیک ہوں |  |
| 22 | Wait for me | میرا انتظار کریں |  |
| 23 | Come to me | میرے پاس آئیں |  |
| 24 | Meet at a meeting point | ملنے کی جگہ پر آ جائیں |  |
| 25 | Need water | پانی چاہیے |  |
| 26 | Need medical help | طبی مدد چاہیے |  |
| 27 | My battery is low | میری بیٹری کم ہے |  |

## SOS

| # | English | Urdu | Fix |
| --- | --- | --- | --- |
| 28 | SOS | SOS |  |
| 29 | Hold for 3 seconds to send SOS. Let go to cancel. | SOS بھیجنے کے لیے 3 سیکنڈ دبائے رکھیں۔ روکنے کے لیے چھوڑ دیں۔ |  |
| 30 | Keep holding | دبائے رکھیں |  |
| 31 | What is happening? | کیا ہو رہا ہے؟ |  |
| 32 | Sending in {{n}} | {{n}} سیکنڈ میں بھیجا جائے گا |  |
| 33 | Just send | بس بھیج دیں |  |
| 34 | Medical | طبی |  |
| 35 | Lost | گمشدہ |  |
| 36 | Danger | خطرہ |  |
| 37 | Silent SOS | خاموش SOS |  |
| 38 | No siren or flashing. Your group is still alerted. | نہ سائرن، نہ چمکتی روشنی۔ آپ کے گروپ کو پھر بھی خبر ہو جائے گی۔ |  |
| 39 | SOS is active | SOS جاری ہے |  |
| 40 | Your group has your location. Times sent: {{n}}. It repeats every 30 seconds. | آپ کے گروپ کے پاس آپ کی لوکیشن ہے۔ {{n}} بار بھیجا گیا۔ یہ ہر 30 سیکنڈ بعد دوبارہ جاتا ہے۔ |  |
| 41 | No phones in range yet. It will send the moment one appears. | ابھی کوئی فون رینج میں نہیں۔ جیسے ہی کوئی فون آئے گا، یہ بھیج دیا جائے گا۔ |  |
| 42 | Siren | سائرن |  |
| 43 | Flash screen | اسکرین چمکائیں |  |
| 44 | I am safe now | میں اب محفوظ ہوں |  |
| 45 | Stop the SOS and tell your group you are safe? | SOS بند کریں اور گروپ کو بتائیں کہ آپ محفوظ ہیں؟ |  |
| 46 | Emergency numbers | ایمرجنسی نمبر |  |
| 47 | Emergency card for rescuers | مدد کرنے والوں کے لیے ایمرجنسی کارڈ |  |
| 48 | {{name}} needs help | {{name}} کو مدد چاہیے |  |
| 49 | {{kind}} | {{kind}} |  |
| 50 | {{distance}} {{direction}} | {{direction}} کی طرف {{distance}} |  |
| 51 | Mark as resolved | حل ہو گیا |  |
| 52 | Go to them | ان کے پاس جائیں |  |
| 53 | Someone nearby needs help | قریب کسی کو مدد چاہیے |  |
| 54 | Roughly {{direction}}, within about {{within}} metres. | تقریباً {{direction}} کی طرف، لگ بھگ {{within}} میٹر کے اندر۔ |  |
| 55 | Only a rough area is shared with strangers. If you can help safely, go towards them. | اجنبیوں کو صرف اندازاً جگہ بتائی جاتی ہے۔ اگر آپ محفوظ طریقے سے مدد کر سکیں تو ان کی طرف جائیں۔ |  |
| 56 | Practice SOS | SOS کی مشق |  |
| 57 | Practice finished. Nothing was sent. | مشق ختم۔ کچھ نہیں بھیجا گیا۔ |  |

## Last-Crumb (low battery location)

| # | English | Urdu | Fix |
| --- | --- | --- | --- |
| 58 | {{name}}'s last location | {{name}} کی آخری لوکیشن |  |
| 59 | Battery was low or the phone switched off at {{time}}. The pin stays on your radar for 24 hours. | {{time}} پر بیٹری کم تھی یا فون بند ہو گیا۔ یہ نشان 24 گھنٹے آپ کے ریڈار پر رہے گا۔ |  |
| 60 | phone switched off | فون بند ہو گیا |  |
| 61 | battery {{n}} percent | بیٹری {{n}} فیصد |  |

## Low battery

| # | English | Urdu | Fix |
| --- | --- | --- | --- |
| 62 | Battery at {{level}} percent | بیٹری {{level}} فیصد |  |
| 63 | Switch to Ultra-saver to keep your phone alive for hours, and tell your group your battery is low? | فون کو گھنٹوں چلانے کے لیے انتہائی بچت پر جائیں، اور گروپ کو بتائیں کہ بیٹری کم ہے؟ |  |
| 64 | Switch to Ultra-saver | انتہائی بچت پر جائیں |  |
| 65 | Tell my group | میرے گروپ کو بتائیں |  |
| 66 | Keep current mode | موجودہ موڈ رکھیں |  |
| 67 | About {{count}} hour left in this mode | اس موڈ میں تقریباً {{count}} گھنٹہ باقی |  |
| 68 | About {{count}} hours left in this mode | اس موڈ میں تقریباً {{count}} گھنٹے باقی |  |

## Check-in

| # | English | Urdu | Fix |
| --- | --- | --- | --- |
| 69 | {{name}} missed a check-in | {{name}} کی حاضری رہ گئی |  |
| 70 | You missed your check-in. Check in now so your group knows you are OK. | آپ کی حاضری رہ گئی۔ ابھی حاضری لگائیں تاکہ گروپ کو پتا چلے کہ آپ ٹھیک ہیں۔ |  |

## Separation alerts

| # | English | Urdu | Fix |
| --- | --- | --- | --- |
| 71 | {{name}} is {{distance}} away | {{name}} {{distance}} دور ہیں |  |
| 72 | Further than your {{threshold}} alert distance. | آپ کے الرٹ کے فاصلے {{threshold}} سے زیادہ دور۔ |  |

## Lost-child card

| # | English | Urdu | Fix |
| --- | --- | --- | --- |
| 73 | Lost-child card | گمشدہ بچے کا کارڈ |  |
| 74 | Put this card in your child's pocket or set it as their lock screen. Anyone with Mesh Radar who scans it alerts your family, with no internet. | یہ کارڈ اپنے بچے کی جیب میں رکھیں یا اس کے فون کی لاک اسکرین پر لگائیں۔ Mesh Radar والا کوئی بھی شخص اسے اسکین کرے تو آپ کے گھر والوں کو خبر ہو جائے گی، انٹرنیٹ کے بغیر۔ |  |
| 75 | Guardian | سرپرست |  |
| 76 | Found this child? Scan with Mesh Radar to alert the family. | یہ بچہ ملا ہے؟ گھر والوں کو خبر کرنے کے لیے Mesh Radar سے اسکین کریں۔ |  |
| 77 | Print card | کارڈ پرنٹ کریں |  |
| 78 | Set as lock screen | لاک اسکرین پر لگائیں |  |
| 79 | Lock screen set. | لاک اسکرین لگ گئی۔ |  |
| 80 | This phone does not allow changing the lock screen from apps. | یہ فون ایپس سے لاک اسکرین بدلنے نہیں دیتا۔ |  |
| 81 | {{name}} was found | {{name}} کا پتا چل گیا |  |
| 82 | Someone scanned the card and is with them. | کسی نے کارڈ اسکین کیا ہے اور وہ بچے کے ساتھ ہے۔ |  |
| 83 | You found a child | آپ کو ایک بچہ ملا ہے |  |
| 84 | Where are you? For example, at the blue stall by Gate 3 | آپ کہاں ہیں؟ مثلاً گیٹ 3 کے پاس نیلے اسٹال پر |  |
| 85 | Alert the family | گھر والوں کو خبر کریں |  |
| 86 | The family has been alerted. Please stay where you are if you can. | گھر والوں کو خبر کر دی گئی ہے۔ اگر ہو سکے تو اسی جگہ رہیں۔ |  |

## Crowd alerts

| # | English | Urdu | Fix |
| --- | --- | --- | --- |
| 87 | Crowd alerts | ہجوم کے الرٹ |  |
| 88 | Shown as verified only after 3 people report the same thing within 200 metres and 5 minutes, or an organiser confirms it. | تصدیق شدہ تب دکھایا جاتا ہے جب 3 لوگ 200 میٹر کے اندر اور 5 منٹ میں ایک ہی بات رپورٹ کریں، یا کوئی منتظم اس کی تصدیق کرے۔ |  |
| 89 | Crush risk | بھگدڑ کا خطرہ |  |
| 90 | Gate closed | گیٹ بند |  |
| 91 | Fire | آگ |  |
| 92 | Medical emergency | طبی ایمرجنسی |  |
| 93 | Flooding | سیلاب |  |
| 94 | Other danger | کوئی اور خطرہ |  |
| 95 | Where, for example Gate 4 | کہاں، مثلاً گیٹ 4 |  |
| 96 | Verified | تصدیق شدہ |  |
| 97 | {{n}} report, not confirmed | {{n}} رپورٹ، تصدیق نہیں ہوئی |  |
| 98 | Confirmed by {{name}} | {{name}} نے تصدیق کی |  |

## Emergency numbers

| # | English | Urdu | Fix |
| --- | --- | --- | --- |
| 99 | Emergency numbers | ایمرجنسی نمبر |  |
| 100 | Call {{number}} | {{number}} پر کال کریں |  |
| 101 | Not yet checked by our team. Confirm locally when you can. | ہماری ٹیم نے ابھی اس کی جانچ نہیں کی۔ موقع ملے تو مقامی طور پر تصدیق کر لیں۔ |  |
| 102 | Country | ملک |  |
| 103 | Saved on your phone. Calling needs a phone signal. | آپ کے فون میں محفوظ ہیں۔ کال کرنے کے لیے فون کا سگنل چاہیے۔ |  |
| 104 | Some mobile networks connect 112 to local emergency services. Use the local numbers above first. | کچھ موبائل نیٹ ورک 112 کو مقامی ایمرجنسی سروس سے ملا دیتے ہیں۔ پہلے اوپر دیے گئے مقامی نمبر استعمال کریں۔ |  |
| 105 | Emergency | ایمرجنسی |  |
| 106 | Police | پولیس |  |
| 107 | Ambulance | ایمبولینس |  |
| 108 | Fire | فائر بریگیڈ |  |
| 109 | Rescue | ریسکیو |  |
| 110 | Tourist police | سیاحتی پولیس |  |
| 111 | Child helpline | بچوں کی ہیلپ لائن |  |
| 112 | Women's helpline | خواتین کی ہیلپ لائن |  |
| 113 | Disaster help | آفات میں مدد |  |
| 114 | Help line | ہیلپ لائن |  |
| 115 | This device cannot make calls. Call this number from another phone. | یہ ڈیوائس کال نہیں کر سکتی۔ یہ نمبر کسی دوسرے فون سے ملائیں۔ |  |

## Elder mode

| # | English | Urdu | Fix |
| --- | --- | --- | --- |
| 116 | Find family | گھر والوں کو ڈھونڈیں |  |
| 117 | Call for help | مدد کے لیے کال کریں |  |
| 118 | I'm OK | میں ٹھیک ہوں |  |
| 119 | Sent to your group | آپ کے گروپ کو بھیج دیا |  |
| 120 | Exit elder mode | بزرگ موڈ بند کریں |  |

## Alerts

| # | English | Urdu | Fix |
| --- | --- | --- | --- |
| 121 | Dismiss | ہٹائیں |  |
| 122 | Open | کھولیں |  |
| 123 | See on radar | ریڈار پر دیکھیں |  |

## Notifications (shown with the app closed)

| # | English | Urdu | Fix |
| --- | --- | --- | --- |
| 124 | Mesh status | میش کی حالت |  |
| 125 | SOS alerts | SOS الرٹ |  |
| 126 | Safety alerts | حفاظتی الرٹ |  |
| 127 | Group messages | گروپ کے پیغامات |  |
| 128 | Mesh Radar is on | Mesh Radar آن ہے |  |
| 129 | {n} phones nearby, {hops} hops | قریب {n} فون، {hops} فون دور تک |  |
| 130 | I'm OK | میں ٹھیک ہوں |  |
| 131 | SOS | SOS |  |
| 132 | Stop | روکیں |  |
| 133 | Emergency card | ایمرجنسی کارڈ |  |
| 134 | Blood group | بلڈ گروپ |  |
| 135 | Conditions | بیماریاں |  |
| 136 | Medicines | دوائیں |  |
| 137 | Contact | رابطہ |  |
| 138 | Hotel or tent | ہوٹل یا خیمہ |  |
| 139 | Someone nearby needs help | قریب کسی کو مدد چاہیے |  |
| 140 | Roughly {direction}, within about {within} m | تقریباً {direction} کی طرف، لگ بھگ {within} میٹر کے اندر |  |
| 141 | {name}'s last location saved | {name} کی آخری لوکیشن محفوظ ہو گئی |  |
| 142 | Battery low or phone off. The pin stays on your radar for 24 hours. | بیٹری کم ہے یا فون بند ہے۔ یہ نشان 24 گھنٹے آپ کے ریڈار پر رہے گا۔ |  |
| 143 | {name} was found | {name} کا پتا چل گیا |  |
| 144 | Open Mesh Radar to see where. | کہاں ہے، یہ دیکھنے کے لیے Mesh Radar کھولیں۔ |  |
| 145 | {name} missed a check-in | {name} کی حاضری رہ گئی |  |
| 146 | See their last known position. | ان کی آخری معلوم جگہ دیکھیں۔ |  |
| 147 | {name} is {distance} m away | {name} {distance} میٹر دور ہیں |  |
| 148 | Tap to find them. | ڈھونڈنے کے لیے دبائیں۔ |  |
| 149 | Verified crowd alert | تصدیق شدہ ہجوم الرٹ |  |
| 150 | Battery at 15 percent | بیٹری 15 فیصد |  |
| 151 | Switch to Ultra-saver and tell your group? | انتہائی بچت پر جائیں اور گروپ کو بتائیں؟ |  |
| 152 | {name} wants to join | {name} شامل ہونا چاہتے ہیں |  |
| 153 | Open Mesh Radar to accept. | قبول کرنے کے لیے Mesh Radar کھولیں۔ |  |
| 154 | {distance} m {direction} | {direction} کی طرف {distance} میٹر |  |
| 155 | SOS from {name} | {name} کا SOS |  |
| 156 | Needs help | مدد چاہیے |  |
| 157 | Medical | طبی |  |
| 158 | Lost | گمشدہ |  |
| 159 | Danger | خطرہ |  |
| 160 | Quick reply | فوری جواب |  |
| 161 | Photo | فوٹو |  |
| 162 | New moment | نیا لمحہ |  |
| 163 | Shared a location | لوکیشن بھیجی |  |
| 164 | I'm OK | میں ٹھیک ہوں |  |
| 165 | Wait for me | میرا انتظار کریں |  |
| 166 | Come to me | میرے پاس آئیں |  |
| 167 | Meet at a meeting point | ملنے کی جگہ پر آ جائیں |  |
| 168 | Need water | پانی چاہیے |  |
| 169 | Need medical help | طبی مدد چاہیے |  |
| 170 | My battery is low | میری بیٹری کم ہے |  |
| 171 | north | شمال |  |
| 172 | north-east | شمال مشرق |  |
| 173 | east | مشرق |  |
| 174 | south-east | جنوب مشرق |  |
| 175 | south | جنوب |  |
| 176 | south-west | جنوب مغرب |  |
| 177 | west | مغرب |  |
| 178 | north-west | شمال مغرب |  |

## Engine missing notice

| # | English | Urdu | Fix |
| --- | --- | --- | --- |
| 179 | The radio engine is missing | ریڈیو انجن موجود نہیں |  |
| 180 | This copy of Mesh Radar cannot use Bluetooth or Wi-Fi, so messages, the radar and SOS do not work. Install Mesh Radar from Google Play. | Mesh Radar کی یہ کاپی بلوٹوتھ اور وائی فائی استعمال نہیں کر سکتی، اس لیے پیغامات، ریڈار اور SOS کام نہیں کریں گے۔ Mesh Radar گوگل پلے سے انسٹال کریں۔ |  |
| 181 | If someone is in danger, call an emergency number now. | اگر کوئی خطرے میں ہے تو ابھی ایمرجنسی نمبر پر کال کریں۔ |  |
| 182 | Open Google Play | گوگل پلے کھولیں |  |

## The rest of the app

The other 495 lines (settings, events, profile and so on) are in `src/i18n/locales/ur.json`. They are not part of the safety review, but corrections are welcome any time.
