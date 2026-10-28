# Contracts

Публичные DTO, import error codes и версии событий размещаются здесь. В TypeScript типы не заменяют runtime validation. Контракты публикуются с версионированием.

`ImportErrorCode` и `ImportError` используются API, worker и import adapters. Ошибка несёт стабильный `code`, а не зависящий от текста `message`; HTTP-граница переводит такие ошибки в `400` с тем же кодом.
