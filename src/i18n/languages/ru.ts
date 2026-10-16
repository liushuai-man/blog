import Key from "../i18nKey";
import type { Translation } from "../translation";

export const ru: Translation = {
	[Key.home]: "Главная",
	[Key.about]: "О нас",
	[Key.archive]: "Архив",
	[Key.search]: "Поиск",
	[Key.searchNoResults]: "Результаты не найдены.",
	[Key.searchTypeSomething]: "Введите ключевое слово для поиска...",
	[Key.searchLoading]: "Поиск...",
	[Key.searchSummary]: "Резюме",
	[Key.searchContent]: "Содержание",
	[Key.searchViewMore]: "Показать еще ({count} шт)",
	[Key.other]: "Прочее",
	[Key.all]: "Все",

	[Key.tags]: "Теги",
	[Key.categories]: "Категории",
	[Key.recentPosts]: "Последние посты",
	[Key.postList]: "Список постов",
	[Key.tableOfContents]: "Содержание",
	[Key.tocEmpty]: "На этой странице нет оглавления",
	[Key.announcement]: "Объявление",
	[Key.announcementClose]: "Закрыть",
	[Key.untitled]: "Без названия",
	[Key.uncategorized]: "Без категории",
	[Key.noTags]: "Нет тегов",

	[Key.wordCount]: "слово",
	[Key.wordsCount]: "слова",
	[Key.minuteCount]: "минута",
	[Key.minutesCount]: "минуты",
	[Key.postCount]: "пост",
	[Key.postsCount]: "постов",

	[Key.themeColor]: "Цвет темы",
	[Key.themeMono]: "Монохром",
	[Key.effects]: "Эффекты",
	[Key.sakuraNum]: "Количество сакуры",
	[Key.sakuraContinuous]: "Непрерывное падение лепестков",
	[Key.sakuraSpeed]: "Скорость падения",

	[Key.lightMode]: "Светлая",
	[Key.darkMode]: "Тёмная",
	[Key.systemMode]: "Система",

	[Key.more]: "Ещё",

	[Key.author]: "Автор",
	[Key.publishedAt]: "Опубликовано",
	[Key.updatedAt]: "Обновлено",
	[Key.readTime]: "Время чтения",
	[Key.license]: "Лицензия",
	// Пагинация
	[Key.paginationFirst]: "Первая",
	[Key.paginationPrev]: "Предыдущая",
	[Key.paginationNext]: "Следующая",
	[Key.paginationLast]: "Последняя",
	[Key.paginationPage]: "Страница",
	[Key.paginationOf]: "из",
	[Key.paginationTotal]: ", всего",
	[Key.paginationRecords]: " записей",

	// 404 Страница
	[Key.notFound]: "404",
	[Key.notFoundTitle]: "Страница не найдена",
	[Key.notFoundDescription]:
		"Извините, страница, которую вы посетили, не существует или была перемещена.",
	[Key.backToHome]: "Вернуться на главную",

	// RSS Страница
	[Key.rss]: "RSS лента",
	[Key.rssDescription]: "Подпишитесь, чтобы получать последние обновления",
	[Key.rssSubtitle]:
		"Подписаться через RSS, чтобы сразу получать последние статьи и обновления",
	[Key.rssLink]: "RSS ссылка",
	[Key.rssCopyToReader]: "Скопировать ссылку в ваш RSS читатель",
	[Key.rssCopyLink]: "Скопировать ссылку",
	[Key.rssLatestPosts]: "Последние посты",
	[Key.rssWhatIsRSS]: "Что такое RSS?",
	[Key.rssWhatIsRSSDescription]:
		"RSS (Really Simple Syndication) — стандартный формат для публикации часто обновляемого контента. С RSS вы можете:",
	[Key.rssBenefit1]:
		"Получать последний контент сайта вовремя без ручного посещения",
	[Key.rssBenefit2]: "Управлять подписками на несколько сайтов в одном месте",
	[Key.rssBenefit3]: "Не пропускать важные обновления и статьи",
	[Key.rssBenefit4]: "Наслаждаться чистым чтением без рекламы",
	[Key.rssHowToUse]:
		"Рекомендуется использовать Feedly, Inoreader или другие RSS читатели для подписки на этот сайт.",
	[Key.rssCopied]: "RSS ссылка скопирована в буфер обмена!",
	[Key.rssCopyFailed]:
		"Ошибка копирования, пожалуйста, скопируйте ссылку вручную",

	// Последнее изменение
	[Key.lastModifiedPrefix]: "Последнее обновление: ",
	[Key.lastModifiedOutdated]: "Некоторый контент может быть устаревшим",
	[Key.lastModifiedDaysAgo]: "{days} дней назад",
	[Key.year]: "год",
	[Key.month]: "месяц",
	[Key.day]: "день",
	[Key.hour]: "час",
	[Key.minute]: "минута",
	[Key.second]: "секунда",

	// Статистика просмотров
	[Key.pageViews]: "Просмотры",
	[Key.pageViewsLoading]: "Загрузка...",
	[Key.pageViewsError]: "Статистика недоступна",

	// Закреплено
	[Key.pinned]: "Закреплено",

	// Похожие статьи
	[Key.relatedPosts]: "Похожие статьи",
	[Key.randomPosts]: "Случайные статьи",
	[Key.smartRecommend]: "Умный",
	[Key.randomRecommend]: "Случайный",

	// Зашифровано
	[Key.postEncrypted]: "Эта статья зашифрована",

	// Режим обоев
	[Key.wallpaperMode]: "Режим обоев",
	[Key.wallpaperBannerMode]: "Баннер обои",
	[Key.wallpaperOverlayMode]: "Прозрачный",
	[Key.wallpaperNoneMode]: "Однотонный фон",

	// Настройки баннера
	[Key.bannerSettings]: "Настройки баннера",
	[Key.bannerTitle]: "Заголовок главного баннера",
	[Key.bannerCarousel]: "Карусель баннера",
	[Key.wavesAnimation]: "Анимация волн",
	[Key.overlaySettings]: "Настройки прозрачности",
	[Key.overlayOpacity]: "Прозрачность обоев",
	[Key.overlayBlur]: "Размытие фона",
	[Key.overlayCardOpacity]: "Прозрачность карточек",

	// Макет списка сообщений
	[Key.postListLayout]: "Макет списка сообщений",
	[Key.postListLayoutList]: "Список",
	[Key.postListLayoutGrid]: "Сетка",

	// Страница спонсоров
	[Key.scanToSponsor]: "Сканировать для поддержки",

	[Key.shareOnSocial]: "Поделиться статьей",
	[Key.shareOnSocialDescription]:
		"Если эта статья помогла вам, пожалуйста, поделитесь ею с другими!",

	// Статистика сайта
	[Key.siteStats]: "Статистика сайта",
	[Key.siteStatsPostCount]: "Статьи",
	[Key.siteStatsCategoryCount]: "Категории",
	[Key.siteStatsTagCount]: "Теги",
	[Key.siteStatsTotalWords]: "Всего слов",
	[Key.siteStatsRunningDays]: "Дней работы",
	[Key.siteStatsLastUpdate]: "Последняя активность",
	[Key.siteStatsDaysAgo]: "{days} дней назад",
	[Key.siteStatsDays]: "{days} дней",
	[Key.today]: "Сегодня",

	// Компонент календаря
	[Key.calendarSunday]: "Вс",
	[Key.calendarMonday]: "Пн",
	[Key.calendarTuesday]: "Вт",
	[Key.calendarWednesday]: "Ср",
	[Key.calendarThursday]: "Чт",
	[Key.calendarFriday]: "Пт",
	[Key.calendarSaturday]: "Сб",
	[Key.calendarJanuary]: "Янв",
	[Key.calendarFebruary]: "Фев",
	[Key.calendarMarch]: "Мар",
	[Key.calendarApril]: "Апр",
	[Key.calendarMay]: "Май",
	[Key.calendarJune]: "Июн",
	[Key.calendarJuly]: "Июл",
	[Key.calendarAugust]: "Авг",
	[Key.calendarSeptember]: "Сен",
	[Key.calendarOctober]: "Окт",
	[Key.calendarNovember]: "Ноя",
	[Key.calendarDecember]: "Дек",

	[Key.shareArticle]: "Поделиться",
	[Key.generatingPoster]: "Создание постера...",
	[Key.copied]: "Скопировано",
	[Key.copyLink]: "Копировать ссылку",
	[Key.savePoster]: "Сохранить постер",
	[Key.scanToRead]: "Сканируйте, чтобы прочитать",

	// Конфигурация блоков коллапсируемого кода
	[Key.codeCollapsibleShowMore]: "Развернуть",
	[Key.codeCollapsibleShowLess]: "Свернуть",
	[Key.codeCollapsibleExpanded]: "Блок кода развернут",
	[Key.codeCollapsibleCollapsed]: "Блок кода свернут",

	// Защита паролем
	[Key.passwordProtected]: "Защищено паролем",
	[Key.passwordProtectedDesc]:
		"Эта статья защищена паролем. Пожалуйста, введите пароль для просмотра содержимого.",
	[Key.passwordHint]: "Подсказка",
	[Key.passwordPlaceholder]: "Введите пароль",
	[Key.passwordSubmit]: "Разблокировать",
	[Key.passwordError]: "Неверный пароль, попробуйте снова.",
	[Key.passwordProtectedRss]:
		"Эта статья зашифрована. Пожалуйста, посетите сайт для просмотра.",
};
