1. USER CREATION

1.1Detalii

1.1.1 Informatii personale
Prenume
Nume
Adresa
Numar de telefon

1.1.2 Adresa Facturare
Companie
Adresa
Oras
Judet
Cod Postal
Tara
Modalitate plata (card, transfer bancar)


1.1.3 Informatii Suplimentare
Entitate (persoana fizica, juridica, pfa)
Registru comertului
Cod fiscal


1.2 Modalitati de plata
Adauga un nou card

-> Descriere, nume, data expirarii, Adresa de facturare (selectie anterioara)



2. Servicii

2.1 Serviciile Mele

Produs/serviciu ex: Abonament solo - SC.ODENT S.R.L
Pret anual/lunar
Urmatoarea scadenta
Stare

-> Afisare detalii

2.2 Adaugare / Afisare

Nume companie
CUI
Tip business (dental, gym, hotel)
Locatii [
    {
        name,
        address,
        active,
    }
]
Setari {
    currency,
    language,
}
configureForEmail,
domainType, ("subdomain", "custom")
label,
customTld,
clientPageType, ("website", "form")
subscriptionType ("solo", "enterprise" - trebuie preluata din stripe)
credits
active (devine true dupa ce platim)


vreau sa
-> pot da upgrade/downgrade la subscriptie (cea solo nu poate avea decat o locatie)
-> sa pot atribui credite la locatii sau general
-> sa pot bloca locatiile din a folosi credite din general (doar creditele alocate)
-> sa pot aloca altcuiva plata si sa devina
active (ultimul) true abia dupa
-> sa pot achizitiona credite ulterior
-> dupa ce devine activa trebuie trimise mesaje in sqs (pentru shard creation) si
in cloudformation (pentru client sau form creation)
-> putem modifica adresa de plata a facturii
-> stergerea companiei declanseaza stergerea shard-ului si al stack-ului 
-> afacerea ramane activa o luna de la expirarea abonamentului


3. Facturile mele

3.1 Afisare

Factura (id)
Data emiterii
Data scadenta
Total
Situatia financiara (achitata/ neachitata)


4. Pagina acasa

Afisam (numere)
Servicii 
Facturi neachitate
Tichete suport

Servicii active (lista)

Tichete (lista)