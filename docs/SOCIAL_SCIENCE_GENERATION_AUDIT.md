# Social Science generation audit

Audit date: 18 October 2026. Catalogue: 20 Class 9 legacy-edition chapters and 22 Class 10 chapters.

## Results

All 42 saved-source server generation checks returned lesson slides. Thirty-five used matching uploaded NCERT text; seven Class 10 Geography chapters used attributed original teacher chapter PDFs because the saved inventory contains no matching Class 10 Geography NCERT volume. The two reported failures, What is Democracy? Why Democracy? and Forest and Wildlife Resources, returned lesson results. Five Class 10 Economics chapters were checked again after separating chapter-opening labels from prose references.

The shared regression run passed 55 tests, including all 42 chapter titles, spaced and shortened headings, overview-first pages, unknown legacy chapter boundaries, unambiguous import grade recovery, combined mind-map isolation and Economics prose references. TypeScript checking and the production build passed.

## Method and limits

The audit invoked the actual generation handler locally against saved library metadata, page text and chunks read through the public database connection. Server-function transport was replaced by a local wrapper; cache reads/writes were isolated, and no library, authentication or storage records were changed. Some page reads reused the read-only source snapshot captured during this audit. The report records returned content and provenance, not a factual certification of every extracted sentence.

Public reading and generation remain independent of administrator sign-in. A title uniquely belonging to the Class 10 catalogue can recover a historical Class 9 teacher import at read time; stored records are unchanged and explicit conflicting filename grades are not overridden. Correctly filed chapter PDFs take priority over duplicate legacy imports.

Browser PDF fetching/rendering and actual PPT/PDF downloads on the published host are not verified by these server checks. Private source downloads require the deployed server's storage credentials; the local public-key storage probe could not confirm object access. Publishing and a browser download check are still required before claiming full live end-to-end coverage. The availability route explicitly identifies teacher PDFs when NCERT text is absent and does not invent NCERT questions.

## Chapter coverage

| Class | Chapter | Generation check | Available source route |
| --- | --- | --- | --- |
| 9 | Chapter 1: The Story of Village Palampur (Economics) | Passed | NCERT chapter text + matching supplied materials |
| 9 | Chapter 2: People as Resource (Economics) | Passed | NCERT chapter text + matching supplied materials |
| 9 | Chapter 3: Poverty as a Challenge (Economics) | Passed | NCERT chapter text + matching supplied materials |
| 9 | Chapter 4: Food Security in India (Economics) | Passed | NCERT chapter text + matching supplied materials |
| 9 | Chapter 1: India – Size and Location (Geography) | Passed | NCERT chapter text + matching supplied materials |
| 9 | Chapter 2: Physical Features of India (Geography) | Passed | NCERT chapter text + matching supplied materials |
| 9 | Chapter 3: Drainage (Geography) | Passed | NCERT chapter text + matching supplied materials |
| 9 | Chapter 4: Climate (Geography) | Passed | NCERT chapter text + matching supplied materials |
| 9 | Chapter 5: Natural Vegetation and Wildlife (Geography) | Passed | NCERT chapter text + matching supplied materials |
| 9 | Chapter 6: Population (Geography) | Passed | NCERT chapter text + matching supplied materials |
| 9 | Chapter 1: The French Revolution (History) | Passed | NCERT chapter text + matching supplied materials |
| 9 | Chapter 2: Socialism in Europe and the Russian Revolution (History) | Passed | NCERT chapter text + matching supplied materials |
| 9 | Chapter 3: Nazism and the Rise of Hitler (History) | Passed | NCERT chapter text + matching supplied materials |
| 9 | Chapter 4: Forest Society and Colonialism (History) | Passed | NCERT chapter text + matching supplied materials |
| 9 | Chapter 5: Pastoralists in the Modern World (History) | Passed | NCERT chapter text + matching supplied materials |
| 9 | Chapter 1: What is Democracy? Why Democracy? (Political Science) | Passed | NCERT chapter text + matching supplied materials |
| 9 | Chapter 2: Constitutional Design (Political Science) | Passed | NCERT chapter text + matching supplied materials |
| 9 | Chapter 3: Electoral Politics (Political Science) | Passed | NCERT chapter text + matching supplied materials |
| 9 | Chapter 4: Working of Institutions (Political Science) | Passed | NCERT chapter text + matching supplied materials |
| 9 | Chapter 5: Democratic Rights (Political Science) | Passed | NCERT chapter text + matching supplied materials |
| 10 | Chapter 1: Development (Economics) | Passed | NCERT chapter text + matching supplied materials |
| 10 | Chapter 2: Sectors of the Indian Economy (Economics) | Passed | NCERT chapter text + matching supplied materials |
| 10 | Chapter 3: Money and Credit (Economics) | Passed | NCERT chapter text + matching supplied materials |
| 10 | Chapter 4: Globalisation and the Indian Economy (Economics) | Passed | NCERT chapter text + matching supplied materials |
| 10 | Chapter 5: Consumer Rights (Economics) | Passed | NCERT chapter text + matching supplied materials |
| 10 | Chapter 1: Resources and Development (Geography) | Passed | Original teacher chapter PDFs |
| 10 | Chapter 2: Forest and Wildlife Resources (Geography) | Passed | Original teacher chapter PDFs |
| 10 | Chapter 3: Water Resources (Geography) | Passed | Original teacher chapter PDFs |
| 10 | Chapter 4: Agriculture (Geography) | Passed | Original teacher chapter PDFs |
| 10 | Chapter 5: Minerals and Energy Resources (Geography) | Passed | Original teacher chapter PDFs |
| 10 | Chapter 6: Manufacturing Industries (Geography) | Passed | Original teacher chapter PDFs |
| 10 | Chapter 7: Lifelines of National Economy (Geography) | Passed | Original teacher chapter PDFs |
| 10 | Chapter 1: The Rise of Nationalism in Europe (History) | Passed | NCERT chapter text + matching supplied materials |
| 10 | Chapter 2: Nationalism in India (History) | Passed | NCERT chapter text + matching supplied materials |
| 10 | Chapter 3: The Making of a Global World (History) | Passed | NCERT chapter text + matching supplied materials |
| 10 | Chapter 4: The Age of Industrialisation (History) | Passed | NCERT chapter text + matching supplied materials |
| 10 | Chapter 5: Print Culture and the Modern World (History) | Passed | NCERT chapter text + matching supplied materials |
| 10 | Chapter 1: Power-sharing (Political Science) | Passed | NCERT chapter text + matching supplied materials |
| 10 | Chapter 2: Federalism (Political Science) | Passed | NCERT chapter text + matching supplied materials |
| 10 | Chapter 3: Gender, Religion and Caste (Political Science) | Passed | NCERT chapter text + matching supplied materials |
| 10 | Chapter 4: Political Parties (Political Science) | Passed | NCERT chapter text + matching supplied materials |
| 10 | Chapter 5: Outcomes of Democracy (Political Science) | Passed | NCERT chapter text + matching supplied materials |
