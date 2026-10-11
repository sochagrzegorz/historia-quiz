# Raport wdrożenia — Egipt Izrael pismo

Data: 11 października 2026.

- Aplikacja: https://sochagrzegorz.github.io/historia-quiz/
- Repozytorium: https://github.com/sochagrzegorz/historia-quiz
- Backend: https://historia-quiz-ai.sochagrzegorz.workers.dev

## Dane i mechanika

Zaimportowano 100 rekordów z dostarczonego JSON, zachowując H-001–H-100: 70 ABCD, 30 otwartych; Egipt 40, Izrael 30, pismo 30. Wszystkie mają temat, trudność, wyjaśnienie i lokalną podpowiedź. Każde ABCD ma cztery warianty i jeden klucz. Nie ma identycznych pytań. Podobne znaczeniowo pytania pozostawiono w bazie i przypisano do grup faktów, aby ograniczyć wspólne losowanie.

10 testów automatycznych danych, losowania i backendu zakończyło się powodzeniem. W 1000 symulacji (seed 42) każda runda miała 7+3 pytania, bez duplikatów, powtórek z ostatnich pięciu rund i wspólnych grup faktów. Wszystkie 100 pytań wystąpiło; każde od 75 do 124 razy. Przetestowano także wyczerpanie puli, mieszanie wariantów, mapowanie klucza, punktację i podsumowanie.

CSS oraz ilustrację porównano z rzeczywistym kodem biologii. Zachowano punktację: ABCD 1, otwarte 0–2, maksymalnie 13; podpowiedź bez kary.

## Przeglądarki i backend

3 pełne scenariusze przeglądarkowe zaliczone: komputer Chromium, emulowany Android Chrome oraz WebKit z profilem iPhone 13. Obejmują 10 odpowiedzi, podpowiedź bez wywołania AI, błąd AI i ponowienie, odświeżenie i wznowienie, wynik, ranking oraz nową rundę. Brak błędów JavaScript i poziomego przewijania w badanych profilach. W tych scenariuszach użyto rzeczywistego kodu Workera, ale atrap AI i KV.

Testy backendu sprawdzają walidację, odrzucenie sfałszowanych wyników, powtórne przesłanie odpowiedzi, CORS i odseparowanie kluczy historii. Awaria AI zwraca błąd i umożliwia ponowienie; nie przyznaje punktów. `npm audit`: 0 wykrytych podatności po usunięciu nieużywanej zależności.

## Rzeczywista produkcja

GitHub Actions [run 38170389823](https://github.com/sochagrzegorz/historia-quiz/actions/runs/38170389823) zakończył build, testy i deploy sukcesem (2 min 41 s), commit `aedfacdd924366a03cc9ad075c856258f1436db7`. Cloudflare: aktywna wersja `7c469422`. Końcowy `verify-final.mjs` potwierdził HTTPS 200 oraz identyczność opublikowanego JSON z lokalną poprawioną bazą: 100 pytań i 100 podpowiedzi. CI zgłasza ostrzeżenia o starszych wersjach Actions uruchamianych już na Node 24 i zapowiedzianej zmianie obrazu ubuntu-latest; nie zablokowały testów ani wdrożenia.

Publiczny adres HTTPS odpowiedział 200. Health backendu potwierdził 100 pytań. Pełna rozgrywka produkcyjna w WebKit/iPhone zakończyła się 13/13, z trzema rzeczywistymi ocenami Workers AI, działającym wznowieniem i zapisem do rankingu jako „Test wdrożenia”. Celowo błędna odpowiedź otwarta została oceniona na 0. Szczegóły: `production-report.json`.

Ponowny test znaczeniowy po poprawce kryterium H-099: H-072, H-075 i H-099 otrzymały po 2/2 za sformułowania inne niż wzorzec. H-099 zawierał tylko jeden poprawny przykład użytkowników cyrylicy. Szczegóły: `semantic-report.json`. Nie jest to gwarancja bezbłędności modelu dla każdej możliwej odpowiedzi.

Biologia pod adresem https://sochagrzegorz.github.io/quiz/biologia/ odpowiedziała 200; potwierdzono 100 pytań, obsługę ABCD, odpowiedź usługi AI dla pytania otwartego i brak błędów JavaScript w wykonanym teście. Nie zapisywano testowego wyniku do rankingu biologii. Jej kod, Worker i dane nie zostały zmienione.

## Wykryte i naprawione problemy

- H-049: doprecyzowano, że Ściana Płaczu jest częścią muru oporowego Wzgórza Świątynnego.
- H-068: polski alfabet ma 32 litery; zdjęcie s. 39 zawiera błędną liczbę 31. Poprawiono sformułowanie pytania i wyjaśnienie.
- H-056: usunięto zależność pytania od nieobecnej ilustracji.
- H-042, H-063, H-066, H-068, H-088: poprawiono wskazówki zbyt bezpośrednio naprowadzające na gotową odpowiedź.
- H-099: produkcyjne AI początkowo zaniżyło ocenę poprawnej odpowiedzi do 1/2; dodano jednoznaczne kryterium, że jeden poprawny przykład narodu wystarcza. Ponowny test: 2/2.
- Mechanizm biologii nie przechowywał historii pięciu rozgrywek; rozszerzono losowanie w niezależnym quizie historii, dodając grupy faktów i bezpieczny powrót do najstarszych pytań.
- Ranking historii oblicza wynik na serwerze, zamiast przyjmować punkty przesłane przez przeglądarkę.
- Poprawiono testowy CORS dla lokalnych scenariuszy i usunięto nieużywaną zależność z podatnościami.
- Równoległa zmiana dodająca audio spowodowała nieudany build oraz odwołanie do nieobecnego MP3. Zachowano tę funkcję, lecz odtwarzacz jest dodawany dopiero, gdy plik MP3 istnieje; oryginalne style biologii pozostają bez zmian.

## Granice weryfikacji

Porównanie z dostarczonymi zdjęciami obejmuje pełne strony 24, 26–29 i 35–39. Brak pełnych zdjęć stron 20–23 i 25 uniemożliwia potwierdzenie zgodności całej bazy z podręcznikiem. Nie testowano na fizycznym iPhonie ani Androidzie; użyto emulacji i silnika WebKit.

Historia używa osobnego Workera i prefiksu `historia:v1:` w istniejącym KV. Limity i blokady w instancji Workera chronią przed prostymi nadużyciami; ze względu na ostateczną spójność KV nie są pełną ochroną przed rozproszonym atakiem. Nie dodano logowania, trackerów ani płatnej infrastruktury. Workers AI pozostaje usługą z limitami konta.
