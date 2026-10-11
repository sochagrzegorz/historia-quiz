# Egipt Izrael pismo

Historia — klasa 5. Quiz oparty na rzeczywistym kodzie biologii z `sochagrzegorz/quiz/biologia/index.html` (SHA źródła a28c1eb5866b4d1f3adfd8e87adeb4632a09b22f).

100 dostarczonych pytań: Egipt 40, Izrael 30, pismo 30. Każda runda: 7 ABCD i 3 otwarte, maksymalnie 13 punktów. Podpowiedzi są lokalne, bez kary punktowej jak w biologii. CSS i ilustracja są zachowane bez zmian.

## Uruchomienie i testy

`npm ci`, `npm run build`, `npm test`, `npx playwright install chromium webkit`, `npm run test:browser`.

`node serve.mjs` udostępnia stronę testową. Testy przeglądarkowe wywołują rzeczywisty kod Workera z atrapami KV i AI. Produkcyjny Worker celowo akceptuje wyłącznie origin GitHub Pages.

GitHub Actions buduje `dist`, wykonuje testy i publikuje na Pages. W Settings / Pages jako Source należy wybrać GitHub Actions.

## Cloudflare

Osobny Worker `historia-quiz-ai`, Workers AI (`AI`) i istniejący KV (`LEADERBOARD`). `wrangler.toml` zawiera konfigurację bez sekretów. Wdrożenie: `npx wrangler deploy` po autoryzacji Cloudflare; alternatywnie `worker-bundle.js` z kompilacji w edytorze Cloudflare i te same dwa bindings.

Wszystkie dane historii mają prefiks `historia:v1:`. Kod nie czyta ani nie zapisuje kluczy biologii/lektury. Wynik oblicza serwer ze sprawdzonych odpowiedzi i wymaga potwierdzenia zakończenia sesji. Dane wpisane przez ucznia są renderowane przez `textContent`. Pseudonim i wynik są publiczne, odpowiedzi sesji wygasają po 2 godzinach. Bez logowania, trackerów i kluczy API w przeglądarce.

Ograniczenia architektury: limity żądań i blokady równoległych ocen działają w obrębie instancji Workera. KV jest ostatecznie spójny, więc rozproszony atak może obejść te limity; to ochrona przed prostą manipulacją, a nie system antycheat. CORS nie zastępuje uwierzytelnienia. Nie wprowadzono płatnej infrastruktury ani zmian istniejącego Workera biologii.

## Weryfikacja treści

Zaimportowano oryginalny JSON z zachowaniem wszystkich ID. Szczegółowe zmiany zawiera `data-review.json`. Zdjęcia obejmują pełne strony 24, 26–29 i 35–39; nie było pełnych zdjęć stron 20–23 i 25, więc dla nich nie potwierdzamy porównania z podręcznikiem.

H-068: podręcznik na s. 39 podaje błędnie 31 liter; polski alfabet ma 32. Usunięto z pytania zwrot „według podręcznika”, pozostawiając poprawną liczbę 32. Źródło: https://zpe.gov.pl/pdf/Pm5bqRd70.

H-049: Ściana Płaczu jest pozostałością muru oporowego Wzgórza Świątynnego, a nie ścianą samego budynku świątyni. Źródło: https://thekotel.org/en/wailing-wall-western-wall/.

H-056: pytanie o ilustrację przeredagowano na samodzielne, ponieważ quiz nie zawiera zdjęcia tabliczki. H-063, H-066, H-068: poprawiono podpowiedzi zbyt bezpośrednio wskazujące odpowiedź. Podobne pytania ABCD i otwarte pozostają w bazie, lecz grupowanie po faktach ogranicza ich wspólne losowanie.

Testy lokalne: 10 testów danych/backendu, 1000 symulacji, 3 pełne scenariusze przeglądarkowe (Chrome desktop, emulacja Android Chrome, WebKit iPhone). Testy emulacyjne nie zastępują sprawdzenia na fizycznym iPhonie. Status produkcji należy potwierdzić osobno po publikacji.
