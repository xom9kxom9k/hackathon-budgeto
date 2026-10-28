# Contracts

Публичные document DTO, profile types, import error codes и версии событий размещаются здесь. В TypeScript типы не заменяют runtime validation. Контракты публикуются с версионированием.

`ImportErrorCode` и `ImportError` используются API, worker и import adapters. Ошибка несёт стабильный `code`, а не зависящий от текста `message`; HTTP-граница переводит такие ошибки в `400` с тем же кодом.

Профили документов остаются декларативными: worker принимает только валидированные поля layout/match/review из `IMPORT_PROFILES_JSON`. Произвольный JavaScript, regex и исполняемые преобразования в профиль не попадают.
