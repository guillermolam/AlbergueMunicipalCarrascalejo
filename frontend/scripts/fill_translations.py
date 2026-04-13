#!/usr/bin/env python3
"""Fill in empty msgstr entries in .po files under src/locales/."""

import os
import re

LOCALES_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "locales")

TRANSLATIONS = {
    "Habitación privada": {
        "en": "Private room", "zh": "私人房间", "hi": "निजी कमरा", "ar": "غرفة خاصة",
        "pt": "Quarto privativo", "ru": "Частная комната", "ja": "個室",
        "de": "Privatzimmer", "fr": "Chambre privée", "it": "Camera privata",
        "ko": "개인실", "id": "Kamar pribadi", "tr": "Özel oda", "vi": "Phòng riêng",
        "ca": "Habitació privada", "eu": "Gela pribatua", "gl": "Cuarto privado", "ast": "Habitación privada",
    },
    "Habitación compartida": {
        "en": "Shared room", "zh": "共享房间", "hi": "साझा कमरा", "ar": "غرفة مشتركة",
        "pt": "Quarto compartilhado", "ru": "Общая комната", "ja": "相部屋",
        "de": "Gemeinschaftszimmer", "fr": "Chambre partagée", "it": "Camera condivisa",
        "ko": "공용 침실", "id": "Kamar bersama", "tr": "Ortak oda", "vi": "Phòng chung",
        "ca": "Habitació compartida", "eu": "Gela partekatua", "gl": "Cuarto compartido", "ast": "Habitación compartida",
    },
    "Reserva {0}": {
        "en": "Booking {0}", "zh": "预订 {0}", "hi": "बुकिंग {0}", "ar": "الحجز {0}",
        "pt": "Reserva {0}", "ru": "Бронирование {0}", "ja": "予約 {0}",
        "de": "Buchung {0}", "fr": "Réservation {0}", "it": "Prenotazione {0}",
        "ko": "예약 {0}", "id": "Pemesanan {0}", "tr": "Rezervasyon {0}", "vi": "Đặt phòng {0}",
        "ca": "Reserva {0}", "eu": "Erreserba {0}", "gl": "Reserva {0}", "ast": "Reserva {0}",
    },
    "Referencia: <0/>": {
        "en": "Reference: <0/>", "zh": "参考编号: <0/>", "hi": "संदर्भ: <0/>", "ar": "مرجع: <0/>",
        "pt": "Referência: <0/>", "ru": "Номер: <0/>", "ja": "参照番号: <0/>",
        "de": "Referenz: <0/>", "fr": "Référence: <0/>", "it": "Riferimento: <0/>",
        "ko": "참조번호: <0/>", "id": "Referensi: <0/>", "tr": "Referans: <0/>", "vi": "Tham chiếu: <0/>",
        "ca": "Referència: <0/>", "eu": "Erreferentzia: <0/>", "gl": "Referencia: <0/>", "ast": "Referencia: <0/>",
    },
    "Nombre": {
        "en": "Name", "zh": "姓名", "hi": "नाम", "ar": "الاسم",
        "pt": "Nome", "ru": "Имя", "ja": "名前",
        "de": "Name", "fr": "Nom", "it": "Nome",
        "ko": "이름", "id": "Nama", "tr": "Ad", "vi": "Tên",
        "ca": "Nom", "eu": "Izena", "gl": "Nome", "ast": "Nome",
    },
    "Código": {
        "en": "Code", "zh": "代码", "hi": "कोड", "ar": "الرمز",
        "pt": "Código", "ru": "Код", "ja": "コード",
        "de": "Code", "fr": "Code", "it": "Codice",
        "ko": "코드", "id": "Kode", "tr": "Kod", "vi": "Mã",
        "ca": "Codi", "eu": "Kodea", "gl": "Código", "ast": "Códigu",
    },
    "Llegada": {
        "en": "Arrival", "zh": "到达", "hi": "आगमन", "ar": "الوصول",
        "pt": "Chegada", "ru": "Прибытие", "ja": "到着",
        "de": "Ankunft", "fr": "Arrivée", "it": "Arrivo",
        "ko": "도착", "id": "Kedatangan", "tr": "Varış", "vi": "Đến nơi",
        "ca": "Arribada", "eu": "Iristea", "gl": "Chegada", "ast": "Llegada",
    },
    "Salida": {
        "en": "Departure", "zh": "离开", "hi": "प्रस्थान", "ar": "المغادرة",
        "pt": "Saída", "ru": "Отъезд", "ja": "出発",
        "de": "Abreise", "fr": "Départ", "it": "Partenza",
        "ko": "출발", "id": "Keberangkatan", "tr": "Ayrılış", "vi": "Khởi hành",
        "ca": "Sortida", "eu": "Irteera", "gl": "Saída", "ast": "Salida",
    },
    "Noches": {
        "en": "Nights", "zh": "晚上", "hi": "रात", "ar": "الليالي",
        "pt": "Noites", "ru": "Ночей", "ja": "泊",
        "de": "Nächte", "fr": "Nuits", "it": "Notti",
        "ko": "박", "id": "Malam", "tr": "Gece", "vi": "Đêm",
        "ca": "Nits", "eu": "Gauak", "gl": "Noites", "ast": "Noches",
    },
    "Tipo": {
        "en": "Type", "zh": "类型", "hi": "प्रकार", "ar": "النوع",
        "pt": "Tipo", "ru": "Тип", "ja": "タイプ",
        "de": "Typ", "fr": "Type", "it": "Tipo",
        "ko": "유형", "id": "Tipe", "tr": "Tür", "vi": "Loại",
        "ca": "Tipus", "eu": "Mota", "gl": "Tipo", "ast": "Triba",
    },
    "Total": {
        "en": "Total", "zh": "总计", "hi": "कुल", "ar": "الإجمالي",
        "pt": "Total", "ru": "Итого", "ja": "合計",
        "de": "Gesamt", "fr": "Total", "it": "Totale",
        "ko": "합계", "id": "Total", "tr": "Toplam", "vi": "Tổng",
        "ca": "Total", "eu": "Guztira", "gl": "Total", "ast": "Total",
    },
    "{0} EUR": {
        "en": "{0} EUR", "zh": "{0} 欧元", "hi": "{0} यूरो", "ar": "{0} يورو",
        "pt": "{0} EUR", "ru": "{0} евро", "ja": "{0} ユーロ",
        "de": "{0} EUR", "fr": "{0} EUR", "it": "{0} EUR",
        "ko": "{0} 유로", "id": "{0} EUR", "tr": "{0} EUR", "vi": "{0} EUR",
        "ca": "{0} EUR", "eu": "{0} EUR", "gl": "{0} EUR", "ast": "{0} EUR",
    },
    "Camino Dashboard": {
        "en": "Camino Dashboard", "zh": "Camino 仪表板", "hi": "Camino डैशबोर्ड", "ar": "لوحة تحكم كامينو",
        "pt": "Painel do Camino", "ru": "Панель Камино", "ja": "カミーノ ダッシュボード",
        "de": "Camino Dashboard", "fr": "Tableau de bord Camino", "it": "Cruscotto Camino",
        "ko": "카미노 대시보드", "id": "Dasbor Camino", "tr": "Camino Kontrol Paneli", "vi": "Bảng điều khiển Camino",
        "ca": "Tauler de Camino", "eu": "Camino panela", "gl": "Panel do Camino", "ast": "Panel del Camino",
    },
    "Doodled shell": {
        "en": "Doodled shell", "zh": "涂鸦贝壳", "hi": "डूडल शंख", "ar": "قوقعة مرسومة",
        "pt": "Concha rabiscada", "ru": "Нарисованная ракушка", "ja": "落書き貝",
        "de": "Gezeichnete Muschel", "fr": "Coquille griffonnée", "it": "Conchiglia disegnata",
        "ko": "낙서 조개", "id": "Cangkang coretan", "tr": "Karalanmış kabuk", "vi": "Vỏ sò nguệch ngoạc",
        "ca": "Closca dibuixada", "eu": "Marraztutako maskorra", "gl": "Cuncha debuxada", "ast": "Cañuca dibuxada",
    },
    "km recorridos": {
        "en": "km traveled", "zh": "公里已行进", "hi": "किमी तय", "ar": "كم مقطوعة",
        "pt": "km percorridos", "ru": "км пройдено", "ja": "km 走破",
        "de": "km zurückgelegt", "fr": "km parcourus", "it": "km percorsi",
        "ko": "km 이동", "id": "km ditempuh", "tr": "km yürüdü", "vi": "km đã đi",
        "ca": "km recorreguts", "eu": "km egindakoak", "gl": "km percorridos", "ast": "km recorríos",
    },
    "días en camino": {
        "en": "days on the trail", "zh": "在路上的天数", "hi": "रास्ते पर दिन", "ar": "أيام في الطريق",
        "pt": "dias no caminho", "ru": "дней в пути", "ja": "旅の日数",
        "de": "Tage unterwegs", "fr": "jours sur le chemin", "it": "giorni in cammino",
        "ko": "여정 일수", "id": "hari di jalan", "tr": "yoldaki günler", "vi": "ngày trên đường",
        "ca": "dies en camí", "eu": "bideko egunak", "gl": "días no camiño", "ast": "díes nel camín",
    },
    "completado": {
        "en": "completed", "zh": "已完成", "hi": "पूर्ण", "ar": "مكتمل",
        "pt": "concluído", "ru": "завершено", "ja": "完了",
        "de": "abgeschlossen", "fr": "complété", "it": "completato",
        "ko": "완료", "id": "selesai", "tr": "tamamlandı", "vi": "hoàn thành",
        "ca": "completat", "eu": "osatuta", "gl": "completado", "ast": "completao",
    },
    "📊 Progreso General": {
        "en": "📊 Overall Progress", "zh": "📊 总体进度", "hi": "📊 समग्र प्रगति", "ar": "📊 التقدم الكلي",
        "pt": "📊 Progresso Geral", "ru": "📊 Общий прогресс", "ja": "📊 全体の進捗",
        "de": "📊 Gesamtfortschritt", "fr": "📊 Progression générale", "it": "📊 Progresso generale",
        "ko": "📊 전체 진행도", "id": "📊 Kemajuan Keseluruhan", "tr": "📊 Genel İlerleme", "vi": "📊 Tiến độ tổng thể",
        "ca": "📊 Progrés general", "eu": "📊 Aurrerapen orokorra", "gl": "📊 Progreso xeral", "ast": "📊 Progresu xeneral",
    },
    "km completados": {
        "en": "km completed", "zh": "公里已完成", "hi": "किमी पूर्ण", "ar": "كم مكتملة",
        "pt": "km concluídos", "ru": "км завершено", "ja": "km 完了",
        "de": "km absolviert", "fr": "km complétés", "it": "km completati",
        "ko": "km 완료", "id": "km selesai", "tr": "km tamamlandı", "vi": "km hoàn thành",
        "ca": "km completats", "eu": "km osatuta", "gl": "km completados", "ast": "km completaos",
    },
    "km restantes": {
        "en": "km remaining", "zh": "公里剩余", "hi": "किमी शेष", "ar": "كم متبقية",
        "pt": "km restantes", "ru": "км осталось", "ja": "km 残り",
        "de": "km verbleibend", "fr": "km restants", "it": "km rimanenti",
        "ko": "km 남음", "id": "km tersisa", "tr": "km kaldı", "vi": "km còn lại",
        "ca": "km restants", "eu": "km geratzen dira", "gl": "km restantes", "ast": "km restantes",
    },
    "km total": {
        "en": "km total", "zh": "总公里数", "hi": "कुल किमी", "ar": "إجمالي كم",
        "pt": "km total", "ru": "км всего", "ja": "km 合計",
        "de": "km gesamt", "fr": "km total", "it": "km totali",
        "ko": "총 km", "id": "km total", "tr": "toplam km", "vi": "tổng km",
        "ca": "km total", "eu": "km guztira", "gl": "km total", "ast": "km total",
    },
    "🎯 Etapa Actual": {
        "en": "🎯 Current Stage", "zh": "🎯 当前阶段", "hi": "🎯 वर्तमान चरण", "ar": "🎯 المرحلة الحالية",
        "pt": "🎯 Etapa Atual", "ru": "🎯 Текущий этап", "ja": "🎯 現在のステージ",
        "de": "🎯 Aktuelle Etappe", "fr": "🎯 Étape actuelle", "it": "🎯 Tappa attuale",
        "ko": "🎯 현재 구간", "id": "🎯 Tahap Saat Ini", "tr": "🎯 Mevcut Aşama", "vi": "🎯 Giai đoạn hiện tại",
        "ca": "🎯 Etapa actual", "eu": "🎯 Uneko etapa", "gl": "🎯 Etapa actual", "ast": "🎯 Etapa actual",
    },
    "38.2 km": {
        "en": "38.2 km", "zh": "38.2 公里", "hi": "38.2 किमी", "ar": "38.2 كم",
        "pt": "38.2 km", "ru": "38.2 км", "ja": "38.2 km",
        "de": "38,2 km", "fr": "38,2 km", "it": "38,2 km",
        "ko": "38.2 km", "id": "38.2 km", "tr": "38,2 km", "vi": "38,2 km",
        "ca": "38,2 km", "eu": "38,2 km", "gl": "38,2 km", "ast": "38,2 km",
    },
    "Progreso de Etapa": {
        "en": "Stage Progress", "zh": "阶段进度", "hi": "चरण प्रगति", "ar": "تقدم المرحلة",
        "pt": "Progresso da Etapa", "ru": "Прогресс этапа", "ja": "ステージ進捗",
        "de": "Etappenfortschritt", "fr": "Progression d'étape", "it": "Progresso della tappa",
        "ko": "구간 진행도", "id": "Kemajuan Tahap", "tr": "Aşama İlerlemesi", "vi": "Tiến độ giai đoạn",
        "ca": "Progrés d'etapa", "eu": "Etaparen aurrerapen", "gl": "Progreso de etapa", "ast": "Progresu d'etapa",
    },
    "Math.round(38.2 * currentStageProgress / 100) + ' km completados'": {
        "en": "Math.round(38.2 * currentStageProgress / 100) + ' km completados'",
        "zh": "Math.round(38.2 * currentStageProgress / 100) + ' km completados'",
        "hi": "Math.round(38.2 * currentStageProgress / 100) + ' km completados'",
        "ar": "Math.round(38.2 * currentStageProgress / 100) + ' km completados'",
        "pt": "Math.round(38.2 * currentStageProgress / 100) + ' km completados'",
        "ru": "Math.round(38.2 * currentStageProgress / 100) + ' km completados'",
        "ja": "Math.round(38.2 * currentStageProgress / 100) + ' km completados'",
        "de": "Math.round(38.2 * currentStageProgress / 100) + ' km completados'",
        "fr": "Math.round(38.2 * currentStageProgress / 100) + ' km completados'",
        "it": "Math.round(38.2 * currentStageProgress / 100) + ' km completados'",
        "ko": "Math.round(38.2 * currentStageProgress / 100) + ' km completados'",
        "id": "Math.round(38.2 * currentStageProgress / 100) + ' km completados'",
        "tr": "Math.round(38.2 * currentStageProgress / 100) + ' km completados'",
        "vi": "Math.round(38.2 * currentStageProgress / 100) + ' km completados'",
        "ca": "Math.round(38.2 * currentStageProgress / 100) + ' km completados'",
        "eu": "Math.round(38.2 * currentStageProgress / 100) + ' km completados'",
        "gl": "Math.round(38.2 * currentStageProgress / 100) + ' km completados'",
        "ast": "Math.round(38.2 * currentStageProgress / 100) + ' km completados'",
    },
    "Math.round(38.2 * (100 - currentStageProgress) / 100) + ' km restantes'": {
        "en": "Math.round(38.2 * (100 - currentStageProgress) / 100) + ' km restantes'",
        "zh": "Math.round(38.2 * (100 - currentStageProgress) / 100) + ' km restantes'",
        "hi": "Math.round(38.2 * (100 - currentStageProgress) / 100) + ' km restantes'",
        "ar": "Math.round(38.2 * (100 - currentStageProgress) / 100) + ' km restantes'",
        "pt": "Math.round(38.2 * (100 - currentStageProgress) / 100) + ' km restantes'",
        "ru": "Math.round(38.2 * (100 - currentStageProgress) / 100) + ' km restantes'",
        "ja": "Math.round(38.2 * (100 - currentStageProgress) / 100) + ' km restantes'",
        "de": "Math.round(38.2 * (100 - currentStageProgress) / 100) + ' km restantes'",
        "fr": "Math.round(38.2 * (100 - currentStageProgress) / 100) + ' km restantes'",
        "it": "Math.round(38.2 * (100 - currentStageProgress) / 100) + ' km restantes'",
        "ko": "Math.round(38.2 * (100 - currentStageProgress) / 100) + ' km restantes'",
        "id": "Math.round(38.2 * (100 - currentStageProgress) / 100) + ' km restantes'",
        "tr": "Math.round(38.2 * (100 - currentStageProgress) / 100) + ' km restantes'",
        "vi": "Math.round(38.2 * (100 - currentStageProgress) / 100) + ' km restantes'",
        "ca": "Math.round(38.2 * (100 - currentStageProgress) / 100) + ' km restantes'",
        "eu": "Math.round(38.2 * (100 - currentStageProgress) / 100) + ' km restantes'",
        "gl": "Math.round(38.2 * (100 - currentStageProgress) / 100) + ' km restantes'",
        "ast": "Math.round(38.2 * (100 - currentStageProgress) / 100) + ' km restantes'",
    },
    "📅 Planificación Diaria": {
        "en": "📅 Daily Planning", "zh": "📅 每日计划", "hi": "📅 दैनिक योजना", "ar": "📅 التخطيط اليومي",
        "pt": "📅 Planejamento Diário", "ru": "📅 Ежедневное планирование", "ja": "📅 デイリープランニング",
        "de": "📅 Tagesplanung", "fr": "📅 Planification quotidienne", "it": "📅 Pianificazione giornaliera",
        "ko": "📅 일일 계획", "id": "📅 Perencanaan Harian", "tr": "📅 Günlük Planlama", "vi": "📅 Lập kế hoạch hàng ngày",
        "ca": "📅 Planificació diària", "eu": "📅 Eguneko plangintza", "gl": "📅 Planificación diaria", "ast": "📅 Planificación diaria",
    },
    "Objetivo diario": {
        "en": "Daily goal", "zh": "每日目标", "hi": "दैनिक लक्ष्य", "ar": "الهدف اليومي",
        "pt": "Meta diária", "ru": "Ежедневная цель", "ja": "日々の目標",
        "de": "Tagesziel", "fr": "Objectif quotidien", "it": "Obiettivo giornaliero",
        "ko": "일일 목표", "id": "Tujuan harian", "tr": "Günlük hedef", "vi": "Mục tiêu hàng ngày",
        "ca": "Objectiu diari", "eu": "Eguneko helburua", "gl": "Obxectivo diario", "ast": "Oxetivu diario",
    },
    "<0/> km": {
        "en": "<0/> km", "zh": "<0/> 公里", "hi": "<0/> किमी", "ar": "<0/> كم",
        "pt": "<0/> km", "ru": "<0/> км", "ja": "<0/> km",
        "de": "<0/> km", "fr": "<0/> km", "it": "<0/> km",
        "ko": "<0/> km", "id": "<0/> km", "tr": "<0/> km", "vi": "<0/> km",
        "ca": "<0/> km", "eu": "<0/> km", "gl": "<0/> km", "ast": "<0/> km",
    },
    "💡 Recomendaciones": {
        "en": "💡 Recommendations", "zh": "💡 建议", "hi": "💡 सिफारिशें", "ar": "💡 التوصيات",
        "pt": "💡 Recomendações", "ru": "💡 Рекомендации", "ja": "💡 おすすめ",
        "de": "💡 Empfehlungen", "fr": "💡 Recommandations", "it": "💡 Raccomandazioni",
        "ko": "💡 추천", "id": "💡 Rekomendasi", "tr": "💡 Öneriler", "vi": "💡 Đề xuất",
        "ca": "💡 Recomanacions", "eu": "💡 Gomendioak", "gl": "💡 Recomendacións", "ast": "💡 Recomendaciones",
    },
    "🎉 Datos Curiosos": {
        "en": "🎉 Fun Facts", "zh": "🎉 趣味事实", "hi": "🎉 रोचक तथ्य", "ar": "🎉 حقائق ممتعة",
        "pt": "🎉 Curiosidades", "ru": "🎉 Интересные факты", "ja": "🎉 豆知識",
        "de": "🎉 Wissenswertes", "fr": "🎉 Le saviez-vous?", "it": "🎉 Curiosità",
        "ko": "🎉 재미있는 사실", "id": "🎉 Fakta Menarik", "tr": "🎉 İlginç Gerçekler", "vi": "🎉 Thông tin thú vị",
        "ca": "🎉 Dades curioses", "eu": "🎉 Datu bitxiak", "gl": "🎉 Datos curiosos", "ast": "🎉 Datos curiosos",
    },
    "🗺️ Próximas Etapas": {
        "en": "🗺️ Upcoming Stages", "zh": "🗺️ 即将到来的阶段", "hi": "🗺️ आगामी चरण", "ar": "🗺️ المراحل القادمة",
        "pt": "🗺️ Próximas Etapas", "ru": "🗺️ Предстоящие этапы", "ja": "🗺️ 次のステージ",
        "de": "🗺️ Nächste Etappen", "fr": "🗺️ Prochaines étapes", "it": "🗺️ Prossime tappe",
        "ko": "🗺️ 다음 구간", "id": "🗺️ Tahap Berikutnya", "tr": "🗺️ Sonraki Aşamalar", "vi": "🗺️ Các giai đoạn tiếp theo",
        "ca": "🗺️ Properes etapes", "eu": "🗺️ Hurrengo etapak", "gl": "🗺️ Próximas etapas", "ast": "🗺️ Próximes etapes",
    },
    "Albergue Municipal Carrascalejo": {
        "en": "Albergue Municipal Carrascalejo", "zh": "Albergue Municipal Carrascalejo",
        "hi": "Albergue Municipal Carrascalejo", "ar": "Albergue Municipal Carrascalejo",
        "pt": "Albergue Municipal Carrascalejo", "ru": "Albergue Municipal Carrascalejo",
        "ja": "Albergue Municipal Carrascalejo", "de": "Albergue Municipal Carrascalejo",
        "fr": "Albergue Municipal Carrascalejo", "it": "Albergue Municipal Carrascalejo",
        "ko": "Albergue Municipal Carrascalejo", "id": "Albergue Municipal Carrascalejo",
        "tr": "Albergue Municipal Carrascalejo", "vi": "Albergue Municipal Carrascalejo",
        "ca": "Albergue Municipal Carrascalejo", "eu": "Albergue Municipal Carrascalejo",
        "gl": "Albergue Municipal Carrascalejo", "ast": "Albergue Municipal Carrascalejo",
    },
    "Hero background": {
        "en": "Hero background", "zh": "主图背景", "hi": "हीरो पृष्ठभूमि", "ar": "خلفية البطل",
        "pt": "Fundo principal", "ru": "Фоновое изображение", "ja": "ヒーロー背景",
        "de": "Hero-Hintergrund", "fr": "Arrière-plan principal", "it": "Sfondo principale",
        "ko": "히어로 배경", "id": "Latar belakang utama", "tr": "Ana arka plan", "vi": "Ảnh nền chính",
        "ca": "Fons principal", "eu": "Hero atzealdearen", "gl": "Fondo principal", "ast": "Fondu principal",
    },
    "Albergue Municipal El Carrascalejo": {
        "en": "Albergue Municipal El Carrascalejo", "zh": "Albergue Municipal El Carrascalejo",
        "hi": "Albergue Municipal El Carrascalejo", "ar": "Albergue Municipal El Carrascalejo",
        "pt": "Albergue Municipal El Carrascalejo", "ru": "Albergue Municipal El Carrascalejo",
        "ja": "Albergue Municipal El Carrascalejo", "de": "Albergue Municipal El Carrascalejo",
        "fr": "Albergue Municipal El Carrascalejo", "it": "Albergue Municipal El Carrascalejo",
        "ko": "Albergue Municipal El Carrascalejo", "id": "Albergue Municipal El Carrascalejo",
        "tr": "Albergue Municipal El Carrascalejo", "vi": "Albergue Municipal El Carrascalejo",
        "ca": "Albergue Municipal El Carrascalejo", "eu": "Albergue Municipal El Carrascalejo",
        "gl": "Albergue Municipal El Carrascalejo", "ast": "Albergue Municipal El Carrascalejo",
    },
    "Stat {0}: {1}{2}": {
        "en": "Stat {0}: {1}{2}", "zh": "统计 {0}: {1}{2}", "hi": "आंकड़ा {0}: {1}{2}", "ar": "إحصاء {0}: {1}{2}",
        "pt": "Estat {0}: {1}{2}", "ru": "Стат {0}: {1}{2}", "ja": "統計 {0}: {1}{2}",
        "de": "Stat {0}: {1}{2}", "fr": "Stat {0}: {1}{2}", "it": "Stat {0}: {1}{2}",
        "ko": "통계 {0}: {1}{2}", "id": "Stat {0}: {1}{2}", "tr": "İstatistik {0}: {1}{2}", "vi": "Thống kê {0}: {1}{2}",
        "ca": "Estat {0}: {1}{2}", "eu": "Estat {0}: {1}{2}", "gl": "Estat {0}: {1}{2}", "ast": "Estad {0}: {1}{2}",
    },
    "Pendiente": {
        "en": "Pending", "zh": "待处理", "hi": "लंबित", "ar": "معلق",
        "pt": "Pendente", "ru": "Ожидает", "ja": "保留中",
        "de": "Ausstehend", "fr": "En attente", "it": "In attesa",
        "ko": "대기 중", "id": "Tertunda", "tr": "Beklemede", "vi": "Đang chờ",
        "ca": "Pendent", "eu": "Zain", "gl": "Pendente", "ast": "Pendiente",
    },
    "Confirmado": {
        "en": "Confirmed", "zh": "已确认", "hi": "पुष्टि हुई", "ar": "مؤكد",
        "pt": "Confirmado", "ru": "Подтверждено", "ja": "確認済み",
        "de": "Bestätigt", "fr": "Confirmé", "it": "Confermato",
        "ko": "확인됨", "id": "Dikonfirmasi", "tr": "Onaylandı", "vi": "Đã xác nhận",
        "ca": "Confirmat", "eu": "Berretsia", "gl": "Confirmado", "ast": "Confirmao",
    },
    "Cancelado": {
        "en": "Cancelled", "zh": "已取消", "hi": "रद्द", "ar": "ملغى",
        "pt": "Cancelado", "ru": "Отменено", "ja": "キャンセル",
        "de": "Storniert", "fr": "Annulé", "it": "Annullato",
        "ko": "취소됨", "id": "Dibatalkan", "tr": "İptal edildi", "vi": "Đã hủy",
        "ca": "Cancel·lat", "eu": "Bertan behera", "gl": "Cancelado", "ast": "Cancelao",
    },
    "Estado desconocido": {
        "en": "Unknown status", "zh": "未知状态", "hi": "अज्ञात स्थिति", "ar": "حالة غير معروفة",
        "pt": "Status desconhecido", "ru": "Неизвестный статус", "ja": "不明なステータス",
        "de": "Unbekannter Status", "fr": "Statut inconnu", "it": "Stato sconosciuto",
        "ko": "알 수 없는 상태", "id": "Status tidak diketahui", "tr": "Bilinmeyen durum", "vi": "Trạng thái không xác định",
        "ca": "Estat desconegut", "eu": "Egoera ezezaguna", "gl": "Estado descoñecido", "ast": "Estáu desconocíu",
    },
    "Hola, {0}": {
        "en": "Hello, {0}", "zh": "你好，{0}", "hi": "नमस्ते, {0}", "ar": "مرحباً، {0}",
        "pt": "Olá, {0}", "ru": "Привет, {0}", "ja": "こんにちは、{0}",
        "de": "Hallo, {0}", "fr": "Bonjour, {0}", "it": "Ciao, {0}",
        "ko": "안녕하세요, {0}", "id": "Halo, {0}", "tr": "Merhaba, {0}", "vi": "Xin chào, {0}",
        "ca": "Hola, {0}", "eu": "Kaixo, {0}", "gl": "Ola, {0}", "ast": "Hola, {0}",
    },
    "País:": {
        "en": "Country:", "zh": "国家：", "hi": "देश:", "ar": "البلد:",
        "pt": "País:", "ru": "Страна:", "ja": "国：",
        "de": "Land:", "fr": "Pays:", "it": "Paese:",
        "ko": "국가:", "id": "Negara:", "tr": "Ülke:", "vi": "Quốc gia:",
        "ca": "País:", "eu": "Herrialdea:", "gl": "País:", "ast": "País:",
    },
    "Teléfono:": {
        "en": "Phone:", "zh": "电话：", "hi": "फोन:", "ar": "الهाتف:",
        "pt": "Telefone:", "ru": "Телефон:", "ja": "電話：",
        "de": "Telefon:", "fr": "Téléphone:", "it": "Telefono:",
        "ko": "전화:", "id": "Telepon:", "tr": "Telefon:", "vi": "Điện thoại:",
        "ca": "Telèfon:", "eu": "Telefonoa:", "gl": "Teléfono:", "ast": "Teléfonu:",
    },
    "Llegada:": {
        "en": "Arrival:", "zh": "到达：", "hi": "आगमन:", "ar": "الوصول:",
        "pt": "Chegada:", "ru": "Прибытие:", "ja": "到着：",
        "de": "Ankunft:", "fr": "Arrivée:", "it": "Arrivo:",
        "ko": "도착:", "id": "Kedatangan:", "tr": "Varış:", "vi": "Đến nơi:",
        "ca": "Arribada:", "eu": "Iristea:", "gl": "Chegada:", "ast": "Llegada:",
    },
    "Cerrar sesión": {
        "en": "Sign out", "zh": "退出登录", "hi": "साइन आउट", "ar": "تسجيل الخروج",
        "pt": "Sair", "ru": "Выйти", "ja": "サインアウト",
        "de": "Abmelden", "fr": "Se déconnecter", "it": "Disconnetti",
        "ko": "로그아웃", "id": "Keluar", "tr": "Çıkış yap", "vi": "Đăng xuất",
        "ca": "Tancar sessió", "eu": "Saioa itxi", "gl": "Pechar sesión", "ast": "Zarrar sesión",
    },
    "Bienvenido peregrino": {
        "en": "Welcome pilgrim", "zh": "欢迎，朝圣者", "hi": "स्वागत है, तीर्थयात्री", "ar": "مرحباً أيها الحاج",
        "pt": "Bem-vindo peregrino", "ru": "Добро пожаловать, паломник", "ja": "ようこそ、巡礼者",
        "de": "Willkommen, Pilger", "fr": "Bienvenue pèlerin", "it": "Benvenuto pellegrino",
        "ko": "환영합니다, 순례자", "id": "Selamat datang peziarah", "tr": "Hoş geldiniz hacı", "vi": "Chào mừng người hành hương",
        "ca": "Benvingut pelegrí", "eu": "Ongi etorri erromes", "gl": "Benvido peregrino", "ast": "Bienveníu pelegrín",
    },
    "Iniciar sesión": {
        "en": "Sign in", "zh": "登录", "hi": "साइन इन", "ar": "تسجيل الدخول",
        "pt": "Entrar", "ru": "Войти", "ja": "サインイン",
        "de": "Anmelden", "fr": "Se connecter", "it": "Accedi",
        "ko": "로그인", "id": "Masuk", "tr": "Giriş yap", "vi": "Đăng nhập",
        "ca": "Iniciar sessió", "eu": "Saioa hasi", "gl": "Iniciar sesión", "ast": "Aniciar sesión",
    },
    "Service status": {
        "en": "Service status", "zh": "服务状态", "hi": "सेवा स्थिति", "ar": "حالة الخدمة",
        "pt": "Status do serviço", "ru": "Статус сервиса", "ja": "サービス状態",
        "de": "Dienststatus", "fr": "État du service", "it": "Stato del servizio",
        "ko": "서비스 상태", "id": "Status layanan", "tr": "Hizmet durumu", "vi": "Trạng thái dịch vụ",
        "ca": "Estat del servei", "eu": "Zerbitzuaren egoera", "gl": "Estado do servizo", "ast": "Estáu del serviciu",
    },
    "Static snapshot": {
        "en": "Static snapshot", "zh": "静态快照", "hi": "स्थिर स्नैपशॉट", "ar": "لقطة ثابتة",
        "pt": "Instantâneo estático", "ru": "Статический снимок", "ja": "静的スナップショット",
        "de": "Statischer Snapshot", "fr": "Instantané statique", "it": "Snapshot statico",
        "ko": "정적 스냅샷", "id": "Snapshot statis", "tr": "Statik anlık görüntü", "vi": "Ảnh chụp tĩnh",
        "ca": "Instantània estàtica", "eu": "Argazki estatikoa", "gl": "Instantánea estática", "ast": "Instantánea estática",
    },
    "Service": {
        "en": "Service", "zh": "服务", "hi": "सेवा", "ar": "الخدمة",
        "pt": "Serviço", "ru": "Сервис", "ja": "サービス",
        "de": "Dienst", "fr": "Service", "it": "Servizio",
        "ko": "서비스", "id": "Layanan", "tr": "Hizmet", "vi": "Dịch vụ",
        "ca": "Servei", "eu": "Zerbitzua", "gl": "Servizo", "ast": "Serviciu",
    },
    "Status": {
        "en": "Status", "zh": "状态", "hi": "स्थिति", "ar": "الحالة",
        "pt": "Status", "ru": "Статус", "ja": "ステータス",
        "de": "Status", "fr": "Statut", "it": "Stato",
        "ko": "상태", "id": "Status", "tr": "Durum", "vi": "Trạng thái",
        "ca": "Estat", "eu": "Egoera", "gl": "Estado", "ast": "Estáu",
    },
    "Response": {
        "en": "Response", "zh": "响应", "hi": "प्रतिक्रिया", "ar": "الاستجابة",
        "pt": "Resposta", "ru": "Ответ", "ja": "レスポンス",
        "de": "Antwort", "fr": "Réponse", "it": "Risposta",
        "ko": "응답", "id": "Respons", "tr": "Yanıt", "vi": "Phản hồi",
        "ca": "Resposta", "eu": "Erantzuna", "gl": "Resposta", "ast": "Respuesta",
    },
    "Message": {
        "en": "Message", "zh": "消息", "hi": "संदेश", "ar": "الرسالة",
        "pt": "Mensagem", "ru": "Сообщение", "ja": "メッセージ",
        "de": "Nachricht", "fr": "Message", "it": "Messaggio",
        "ko": "메시지", "id": "Pesan", "tr": "Mesaj", "vi": "Tin nhắn",
        "ca": "Missatge", "eu": "Mezua", "gl": "Mensaxe", "ast": "Mensaxe",
    },
    "Select Your Bed": {
        "en": "Select Your Bed", "zh": "选择你的床位", "hi": "अपना बिस्तर चुनें", "ar": "اختر سريرك",
        "pt": "Selecione sua cama", "ru": "Выберите кровать", "ja": "ベッドを選択",
        "de": "Bett auswählen", "fr": "Choisissez votre lit", "it": "Seleziona il tuo letto",
        "ko": "침대 선택", "id": "Pilih Tempat Tidur", "tr": "Yatağınızı Seçin", "vi": "Chọn giường của bạn",
        "ca": "Seleccioneu el vostre llit", "eu": "Aukeratu zure ohea", "gl": "Seleccione a súa cama", "ast": "Selecciona la to cama",
    },
    "Choose from our comfortable dormitories": {
        "en": "Choose from our comfortable dormitories", "zh": "从我们舒适的宿舍中选择", "hi": "हमारे आरामदायक छात्रावासों से चुनें", "ar": "اختر من نزلنا المريحة",
        "pt": "Escolha entre nossos dormitórios confortáveis", "ru": "Выберите из наших уютных общежитий", "ja": "快適な宿舎からお選びください",
        "de": "Wählen Sie aus unseren komfortablen Schlafsälen", "fr": "Choisissez parmi nos dortoirs confortables", "it": "Scegli tra i nostri comodi dormitori",
        "ko": "편안한 기숙사 중에서 선택하세요", "id": "Pilih dari asrama kami yang nyaman", "tr": "Rahat yurtlarımızdan seçin", "vi": "Chọn từ các phòng ngủ tập thể thoải mái của chúng tôi",
        "ca": "Trieu entre els nostres dormitoris confortables", "eu": "Aukeratu gure gela erosoetatik", "gl": "Escolla entre os nosos dormitorios confortables", "ast": "Escueye ente los nuestros dormitorios cómodos",
    },
    "<0/>Full": {
        "en": "<0/>Full", "zh": "<0/>满员", "hi": "<0/>पूर्ण", "ar": "<0/>مكتمل",
        "pt": "<0/>Completo", "ru": "<0/>Занято", "ja": "<0/>満室",
        "de": "<0/>Voll", "fr": "<0/>Complet", "it": "<0/>Completo",
        "ko": "<0/>만원", "id": "<0/>Penuh", "tr": "<0/>Dolu", "vi": "<0/>Đầy",
        "ca": "<0/>Ple", "eu": "<0/>Betea", "gl": "<0/>Cheo", "ast": "<0/>Completu",
    },
    "<0/>Partial": {
        "en": "<0/>Partial", "zh": "<0/>部分", "hi": "<0/>आंशिक", "ar": "<0/>جزئي",
        "pt": "<0/>Parcial", "ru": "<0/>Частично", "ja": "<0/>一部",
        "de": "<0/>Teilweise", "fr": "<0/>Partiel", "it": "<0/>Parziale",
        "ko": "<0/>일부", "id": "<0/>Sebagian", "tr": "<0/>Kısmi", "vi": "<0/>Một phần",
        "ca": "<0/>Parcial", "eu": "<0/>Partziala", "gl": "<0/>Parcial", "ast": "<0/>Parcial",
    },
    "<0/>Selected": {
        "en": "<0/>Selected", "zh": "<0/>已选", "hi": "<0/>चुना गया", "ar": "<0/>محدد",
        "pt": "<0/>Selecionado", "ru": "<0/>Выбрано", "ja": "<0/>選択中",
        "de": "<0/>Ausgewählt", "fr": "<0/>Sélectionné", "it": "<0/>Selezionato",
        "ko": "<0/>선택됨", "id": "<0/>Dipilih", "tr": "<0/>Seçildi", "vi": "<0/>Đã chọn",
        "ca": "<0/>Seleccionat", "eu": "<0/>Hautatua", "gl": "<0/>Seleccionado", "ast": "<0/>Seleicionao",
    },
    "<0/>Occupied": {
        "en": "<0/>Occupied", "zh": "<0/>已占用", "hi": "<0/>अधिकृत", "ar": "<0/>مشغول",
        "pt": "<0/>Ocupado", "ru": "<0/>Занято", "ja": "<0/>使用中",
        "de": "<0/>Belegt", "fr": "<0/>Occupé", "it": "<0/>Occupato",
        "ko": "<0/>점유됨", "id": "<0/>Ditempati", "tr": "<0/>Dolu", "vi": "<0/>Đã có người",
        "ca": "<0/>Ocupat", "eu": "<0/>Okupatua", "gl": "<0/>Ocupado", "ast": "<0/>Ocupao",
    },
    "Select bed for:": {
        "en": "Select bed for:", "zh": "为以下人员选择床位：", "hi": "के लिए बिस्तर चुनें:", "ar": "اختر السرير لـ:",
        "pt": "Selecionar cama para:", "ru": "Выберите кровать для:", "ja": "ベッドを選択：",
        "de": "Bett auswählen für:", "fr": "Sélectionner un lit pour:", "it": "Seleziona letto per:",
        "ko": "침대 선택 대상:", "id": "Pilih tempat tidur untuk:", "tr": "Şunun için yatak seçin:", "vi": "Chọn giường cho:",
        "ca": "Seleccioneu el llit per a:", "eu": "Hautatu ohea honentzat:", "gl": "Seleccionar cama para:", "ast": "Seleicionar cama pa:",
    },
    "Your stay:": {
        "en": "Your stay:", "zh": "您的入住：", "hi": "आपका प्रवास:", "ar": "إقامتك:",
        "pt": "Sua estadia:", "ru": "Ваше пребывание:", "ja": "ご滞在：",
        "de": "Ihr Aufenthalt:", "fr": "Votre séjour:", "it": "Il tuo soggiorno:",
        "ko": "귀하의 숙박:", "id": "Menginap Anda:", "tr": "Konaklamanız:", "vi": "Thời gian lưu trú:",
        "ca": "La vostra estada:", "eu": "Zure egonaldia:", "gl": "A súa estadía:", "ast": "La to estancia:",
    },
    "Your Bed Schedule": {
        "en": "Your Bed Schedule", "zh": "您的床位安排", "hi": "आपका बिस्तर कार्यक्रम", "ar": "جدول سريرك",
        "pt": "Sua programação de cama", "ru": "Расписание кровати", "ja": "ベッドスケジュール",
        "de": "Ihr Bettplan", "fr": "Votre planning de lit", "it": "Il tuo programma letto",
        "ko": "침대 일정", "id": "Jadwal Tempat Tidur", "tr": "Yatak Programınız", "vi": "Lịch giường của bạn",
        "ca": "El vostre horari de llit", "eu": "Zure ohe ordutegiak", "gl": "O seu horario de cama", "ast": "El to horario de cama",
    },
    "<0/> Dormitory 1 <1>(Beds 1-12)</1>": {
        "en": "<0/> Dormitory 1 <1>(Beds 1-12)</1>", "zh": "<0/> 宿舍1 <1>(1-12号床)</1>",
        "hi": "<0/> छात्रावास 1 <1>(बिस्तर 1-12)</1>", "ar": "<0/> المهجع 1 <1>(أسرة 1-12)</1>",
        "pt": "<0/> Dormitório 1 <1>(Camas 1-12)</1>", "ru": "<0/> Спальня 1 <1>(Кровати 1-12)</1>",
        "ja": "<0/> 宿舎1 <1>(ベッド1-12)</1>", "de": "<0/> Schlafsaal 1 <1>(Betten 1-12)</1>",
        "fr": "<0/> Dortoir 1 <1>(Lits 1-12)</1>", "it": "<0/> Dormitorio 1 <1>(Letti 1-12)</1>",
        "ko": "<0/> 기숙사 1 <1>(침대 1-12)</1>", "id": "<0/> Asrama 1 <1>(Tempat Tidur 1-12)</1>",
        "tr": "<0/> Yurt 1 <1>(Yataklar 1-12)</1>", "vi": "<0/> Phòng ngủ tập thể 1 <1>(Giường 1-12)</1>",
        "ca": "<0/> Dormitori 1 <1>(Llits 1-12)</1>", "eu": "<0/> Logelda 1 <1>(Oheak 1-12)</1>",
        "gl": "<0/> Dormitorio 1 <1>(Camas 1-12)</1>", "ast": "<0/> Dormitoriu 1 <1>(Cames 1-12)</1>",
    },
    "<0/> Dormitory 2 <1>(Beds 13-24)</1>": {
        "en": "<0/> Dormitory 2 <1>(Beds 13-24)</1>", "zh": "<0/> 宿舍2 <1>(13-24号床)</1>",
        "hi": "<0/> छात्रावास 2 <1>(बिस्तर 13-24)</1>", "ar": "<0/> المهجع 2 <1>(أسرة 13-24)</1>",
        "pt": "<0/> Dormitório 2 <1>(Camas 13-24)</1>", "ru": "<0/> Спальня 2 <1>(Кровати 13-24)</1>",
        "ja": "<0/> 宿舎2 <1>(ベッド13-24)</1>", "de": "<0/> Schlafsaal 2 <1>(Betten 13-24)</1>",
        "fr": "<0/> Dortoir 2 <1>(Lits 13-24)</1>", "it": "<0/> Dormitorio 2 <1>(Letti 13-24)</1>",
        "ko": "<0/> 기숙사 2 <1>(침대 13-24)</1>", "id": "<0/> Asrama 2 <1>(Tempat Tidur 13-24)</1>",
        "tr": "<0/> Yurt 2 <1>(Yataklar 13-24)</1>", "vi": "<0/> Phòng ngủ tập thể 2 <1>(Giường 13-24)</1>",
        "ca": "<0/> Dormitori 2 <1>(Llits 13-24)</1>", "eu": "<0/> Logelda 2 <1>(Oheak 13-24)</1>",
        "gl": "<0/> Dormitorio 2 <1>(Camas 13-24)</1>", "ast": "<0/> Dormitoriu 2 <1>(Cames 13-24)</1>",
    },
    "Bed #1": {
        "en": "Bed #1", "zh": "1号床", "hi": "बिस्तर #1", "ar": "سرير #1",
        "pt": "Cama #1", "ru": "Кровать №1", "ja": "ベッド#1",
        "de": "Bett #1", "fr": "Lit #1", "it": "Letto #1",
        "ko": "침대 #1", "id": "Tempat Tidur #1", "tr": "Yatak #1", "vi": "Giường #1",
        "ca": "Llit #1", "eu": "Ohea #1", "gl": "Cama #1", "ast": "Cama #1",
    },
    "Bottom Bunk": {
        "en": "Bottom Bunk", "zh": "下铺", "hi": "निचली चारपाई", "ar": "السرير السفلي",
        "pt": "Beliche inferior", "ru": "Нижняя полка", "ja": "下段ベッド",
        "de": "Unteres Stockbett", "fr": "Lit du bas", "it": "Cuccetta inferiore",
        "ko": "아래 침대", "id": "Kasur bawah", "tr": "Alt ranza", "vi": "Giường tầng dưới",
        "ca": "Llit inferior", "eu": "Beheko ohea", "gl": "Beliche inferior", "ast": "Cama de baxo",
    },
    "Bunk #1": {
        "en": "Bunk #1", "zh": "1号铺位", "hi": "चारपाई #1", "ar": "رانزا #1",
        "pt": "Beliche #1", "ru": "Полка №1", "ja": "バンク#1",
        "de": "Etagenbett #1", "fr": "Couchette #1", "it": "Cuccetta #1",
        "ko": "이층침대 #1", "id": "Ranjang susun #1", "tr": "Ranza #1", "vi": "Giường tầng #1",
        "ca": "Llit doble #1", "eu": "Litera #1", "gl": "Beliche #1", "ast": "Liteira #1",
    },
    "Dormitory 1": {
        "en": "Dormitory 1", "zh": "宿舍1", "hi": "छात्रावास 1", "ar": "المهجع 1",
        "pt": "Dormitório 1", "ru": "Спальня 1", "ja": "宿舎1",
        "de": "Schlafsaal 1", "fr": "Dortoir 1", "it": "Dormitorio 1",
        "ko": "기숙사 1", "id": "Asrama 1", "tr": "Yurt 1", "vi": "Phòng ngủ tập thể 1",
        "ca": "Dormitori 1", "eu": "Logelda 1", "gl": "Dormitorio 1", "ast": "Dormitoriu 1",
    },
    "Ready!": {
        "en": "Ready!", "zh": "准备好了！", "hi": "तैयार!", "ar": "جاهز!",
        "pt": "Pronto!", "ru": "Готово!", "ja": "準備完了！",
        "de": "Fertig!", "fr": "Prêt!", "it": "Pronto!",
        "ko": "준비 완료!", "id": "Siap!", "tr": "Hazır!", "vi": "Sẵn sàng!",
        "ca": "Llest!", "eu": "Prest!", "gl": "Listo!", "ast": "¡Llisto!",
    },
    "Your bed is reserved": {
        "en": "Your bed is reserved", "zh": "您的床位已预订", "hi": "आपका बिस्तर आरक्षित है", "ar": "سريرك محجوز",
        "pt": "Sua cama está reservada", "ru": "Ваша кровать забронирована", "ja": "ベッドが予約されました",
        "de": "Ihr Bett ist reserviert", "fr": "Votre lit est réservé", "it": "Il tuo letto è prenotato",
        "ko": "침대가 예약되었습니다", "id": "Tempat tidur Anda dipesan", "tr": "Yatağınız rezerve edildi", "vi": "Giường của bạn đã được đặt",
        "ca": "El vostre llit està reservat", "eu": "Zure ohea erreserbatuta dago", "gl": "A súa cama está reservada", "ast": "La to cama ta reservada",
    },
    "Hover over a bed to see availability, tap to assign": {
        "en": "Hover over a bed to see availability, tap to assign",
        "zh": "悬停在床位上查看可用情况，点击分配",
        "hi": "उपलब्धता देखने के लिए बिस्तर पर होवर करें, असाइन करने के लिए टैप करें",
        "ar": "مرر فوق سرير لرؤية التوفر، اضغط للتخصيص",
        "pt": "Passe o mouse sobre uma cama para ver disponibilidade, toque para atribuir",
        "ru": "Наведите на кровать для просмотра доступности, нажмите для назначения",
        "ja": "ベッドにホバーして空き状況を確認、タップして割り当て",
        "de": "Fahren Sie über ein Bett um die Verfügbarkeit zu sehen, tippen Sie zum Zuweisen",
        "fr": "Survolez un lit pour voir la disponibilité, appuyez pour assigner",
        "it": "Passa sopra un letto per vedere la disponibilità, tocca per assegnare",
        "ko": "침대 위에 마우스를 올려 가용성 확인, 탭하여 배정",
        "id": "Arahkan ke tempat tidur untuk melihat ketersediaan, ketuk untuk menetapkan",
        "tr": "Müsaitliği görmek için yatağın üzerine gelin, atamak için dokunun",
        "vi": "Di chuột qua giường để xem sẵn có, nhấn để chọn",
        "ca": "Passeu per sobre d'un llit per veure la disponibilitat, toqueu per assignar",
        "eu": "Mugitu sagua ohe baten gainetik eskuragarritasuna ikusteko, sakatu esleitzeko",
        "gl": "Pase o rato por riba dunha cama para ver dispoñibilidade, toque para asignar",
        "ast": "Pasa'l mur por enriba d'una cama p'afayar disponibilidad, toca pa asignar",
    },
    "Bed #1 — Top Bunk": {
        "en": "Bed #1 — Top Bunk", "zh": "1号床 — 上铺", "hi": "बिस्तर #1 — ऊपरी चारपाई", "ar": "سرير #1 — السرير العلوي",
        "pt": "Cama #1 — Beliche superior", "ru": "Кровать №1 — Верхняя полка", "ja": "ベッド#1 — 上段",
        "de": "Bett #1 — Oberes Stockbett", "fr": "Lit #1 — Lit du haut", "it": "Letto #1 — Cuccetta superiore",
        "ko": "침대 #1 — 위 침대", "id": "Tempat Tidur #1 — Kasur atas", "tr": "Yatak #1 — Üst ranza", "vi": "Giường #1 — Giường tầng trên",
        "ca": "Llit #1 — Llit superior", "eu": "Ohea #1 — Goiko ohea", "gl": "Cama #1 — Beliche superior", "ast": "Cama #1 — Cama de riba",
    },
    "¡Reserva Confirmada!": {
        "en": "Booking Confirmed!", "zh": "预订已确认！", "hi": "बुकिंग की पुष्टि हुई!", "ar": "تم تأكيد الحجز!",
        "pt": "Reserva Confirmada!", "ru": "Бронирование подтверждено!", "ja": "予約が確定しました！",
        "de": "Buchung bestätigt!", "fr": "Réservation confirmée!", "it": "Prenotazione confermata!",
        "ko": "예약 확인됨!", "id": "Pemesanan Dikonfirmasi!", "tr": "Rezervasyon Onaylandı!", "vi": "Đặt phòng đã xác nhận!",
        "ca": "Reserva Confirmada!", "eu": "Erreserba berretsia!", "gl": "Reserva Confirmada!", "ast": "¡Reserva Confirmada!",
    },
    "Recibirás una confirmación por email. ¡Buen Camino! 🥾": {
        "en": "You'll receive a confirmation by email. Have a good Camino! 🥾",
        "zh": "您将收到一封确认邮件。祝您Camino愉快！🥾",
        "hi": "आपको ईमेल द्वारा पुष्टि मिलेगी। शुभ Camino! 🥾",
        "ar": "ستتلقى تأكيداً عبر البريد الإلكتروني. طريق موفق! 🥾",
        "pt": "Você receberá uma confirmação por e-mail. Bom Camino! 🥾",
        "ru": "Вы получите подтверждение по электронной почте. Удачного Камино! 🥾",
        "ja": "メールで確認書をお送りします。良いカミーノを！🥾",
        "de": "Sie erhalten eine Bestätigung per E-Mail. Guten Camino! 🥾",
        "fr": "Vous recevrez une confirmation par email. Bon Camino! 🥾",
        "it": "Riceverai una conferma via email. Buon Camino! 🥾",
        "ko": "이메일로 확인서를 받으실 것입니다. 좋은 카미노 되세요! 🥾",
        "id": "Anda akan menerima konfirmasi melalui email. Selamat Camino! 🥾",
        "tr": "E-posta ile bir onay alacaksınız. İyi Camino'lar! 🥾",
        "vi": "Bạn sẽ nhận được xác nhận qua email. Chúc Camino vui vẻ! 🥾",
        "ca": "Rebreu una confirmació per correu electrònic. Bon Camí! 🥾",
        "eu": "Baieztapena jasoko duzu posta elektronikoz. Ondo ibili Camino! 🥾",
        "gl": "Recibirás unha confirmación por correo electrónico. Bo Camiño! 🥾",
        "ast": "Recibirás una confirmación pol correo. ¡Bon Camín! 🥾",
    },
    "Reference": {
        "en": "Reference", "zh": "参考", "hi": "संदर्भ", "ar": "مرجع",
        "pt": "Referência", "ru": "Ссылка", "ja": "参照",
        "de": "Referenz", "fr": "Référence", "it": "Riferimento",
        "ko": "참조", "id": "Referensi", "tr": "Referans", "vi": "Tham chiếu",
        "ca": "Referència", "eu": "Erreferentzia", "gl": "Referencia", "ast": "Referencia",
    },
    "ALB-2026-XXXX": {
        "en": "ALB-2026-XXXX", "zh": "ALB-2026-XXXX", "hi": "ALB-2026-XXXX", "ar": "ALB-2026-XXXX",
        "pt": "ALB-2026-XXXX", "ru": "ALB-2026-XXXX", "ja": "ALB-2026-XXXX",
        "de": "ALB-2026-XXXX", "fr": "ALB-2026-XXXX", "it": "ALB-2026-XXXX",
        "ko": "ALB-2026-XXXX", "id": "ALB-2026-XXXX", "tr": "ALB-2026-XXXX", "vi": "ALB-2026-XXXX",
        "ca": "ALB-2026-XXXX", "eu": "ALB-2026-XXXX", "gl": "ALB-2026-XXXX", "ast": "ALB-2026-XXXX",
    },
    "Ver Confirmación": {
        "en": "View Confirmation", "zh": "查看确认", "hi": "पुष्टि देखें", "ar": "عرض التأكيد",
        "pt": "Ver Confirmação", "ru": "Просмотреть подтверждение", "ja": "確認書を見る",
        "de": "Bestätigung anzeigen", "fr": "Voir la confirmation", "it": "Visualizza conferma",
        "ko": "확인서 보기", "id": "Lihat Konfirmasi", "tr": "Onayı Görüntüle", "vi": "Xem xác nhận",
        "ca": "Veure Confirmació", "eu": "Ikusi baieztapena", "gl": "Ver Confirmación", "ast": "Ver Confirmación",
    },
    "Mi Dashboard": {
        "en": "My Dashboard", "zh": "我的仪表板", "hi": "मेरा डैशबोर्ड", "ar": "لوحة التحكم الخاصة بي",
        "pt": "Meu Painel", "ru": "Мой дашборд", "ja": "マイダッシュボード",
        "de": "Mein Dashboard", "fr": "Mon tableau de bord", "it": "La mia dashboard",
        "ko": "내 대시보드", "id": "Dasbor Saya", "tr": "Benim Panelim", "vi": "Bảng điều khiển của tôi",
        "ca": "El meu tauler", "eu": "Nire panela", "gl": "O meu panel", "ast": "El mio panel",
    },
}


def extract_locale_from_content(content: str) -> str | None:
    """Extract the locale code from the file header."""
    match = re.search(r'"Language:\s*(\S+?)\\n"', content)
    if match:
        return match.group(1).strip()
    return None


def process_po_file(filepath: str) -> tuple[int, int]:
    """Process a single .po file, filling in empty msgstrs. Returns (filled, skipped)."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    locale = extract_locale_from_content(content)
    if not locale:
        print(f"  WARNING: Could not determine locale for {filepath}")
        return 0, 0

    lines = content.splitlines(keepends=True)
    out_lines = []
    i = 0
    filled = 0
    skipped = 0
    current_msgid = None

    while i < len(lines):
        line = lines[i]

        # Detect msgid line
        msgid_match = re.match(r'^msgid "(.*)"$', line.rstrip("\n\r"))
        if msgid_match:
            current_msgid = msgid_match.group(1)
            out_lines.append(line)
            i += 1
            continue

        # Detect msgstr line
        msgstr_match = re.match(r'^msgstr "(.*)"$', line.rstrip("\n\r"))
        if msgstr_match:
            existing_val = msgstr_match.group(1)
            # Fill if empty OR if the msgstr equals the msgid (untranslated placeholder)
            needs_fill = (
                current_msgid is not None
                and current_msgid != ""
                and (existing_val == "" or existing_val == current_msgid)
            )
            if needs_fill:
                # Look up translation
                translation_map = TRANSLATIONS.get(current_msgid)
                if translation_map and locale in translation_map:
                    translation = translation_map[locale]
                    # Escape backslashes and double-quotes in translation
                    escaped = translation.replace("\\", "\\\\").replace('"', '\\"')
                    out_lines.append(f'msgstr "{escaped}"\n')
                    filled += 1
                else:
                    out_lines.append(line)
                    skipped += 1
            else:
                out_lines.append(line)
            current_msgid = None
            i += 1
            continue

        # Any other line resets the current_msgid tracking (only if it's not a comment)
        if not line.startswith("#"):
            current_msgid = None

        out_lines.append(line)
        i += 1

    new_content = "".join(out_lines)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)

    return filled, skipped


def main():
    locales_dir = os.path.abspath(LOCALES_DIR)
    po_files = sorted(
        f for f in os.listdir(locales_dir) if f.endswith(".po")
    )

    total_filled = 0
    total_skipped = 0

    for filename in po_files:
        filepath = os.path.join(locales_dir, filename)
        filled, skipped = process_po_file(filepath)
        total_filled += filled
        total_skipped += skipped
        print(f"  {filename}: filled={filled}, no_translation={skipped}")

    print(f"\nDone. Total filled: {total_filled}, total without translation: {total_skipped}")


if __name__ == "__main__":
    main()
