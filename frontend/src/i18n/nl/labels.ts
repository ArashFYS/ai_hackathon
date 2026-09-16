// Dutch labels for backend enum codes (status, certainty, sources, sectors, …).
export const nlLabels = {
  'status.actief': 'Actief',
  'status.ter_controle': 'Ter controle',
  'status.waarschijnlijk_niet_actief': 'Waarschijnlijk niet actief',
  'status.geen_onderneming': 'Geen onderneming',

  'certainty.hoog': 'Hoog',
  'certainty.middel': 'Middel',
  'certainty.laag': 'Laag',
  'certainty.title': 'Zekerheid',

  'conclusion.actief': 'actief',
  'conclusion.niet_actief': 'niet actief',
  'conclusion.onduidelijk': 'onduidelijk',

  'proposalStatus.open': 'Open',
  'proposalStatus.bevestigd': 'Bevestigd',
  'proposalStatus.afgewezen': 'Afgewezen',

  'source.google_maps': 'Google Maps',
  'source.street_view': 'Street View',
  'source.website': 'Website',
  'source.terreinbezoek': 'Terreinbezoek',
  'source.kbo': 'KBO',
  'source.nbb': 'NBB',
  'source.inhoudingsplicht': 'Check Inhoudingsplicht',
  'source.staatsblad': 'Belgisch Staatsblad',
  'source.andere': 'Andere',

  // Short contact indicator in lists (Zoeken column).
  'contactStatus.register': '☎ register',
  'contactStatus.zetel': '☎ zetel',
  'contactStatus.waargenomen': '☎ waargenomen',
  'contactStatus.onbekend': '—',
  // Long form in the ContactBlock badge.
  'contactText.register': 'in register',
  'contactText.zetel': 'via zetel',
  'contactText.waargenomen': 'waargenomen',
  'contactText.onbekend': 'onbekend',
  'contactKind.phone': 'Telefoon',
  'contactKind.email': 'E-mail',
  'contactKind.website': 'Website',
  'belongsTo.vestiging': 'vestiging',
  'belongsTo.zetel': 'zetel',

  'recordType.enterprise': 'onderneming',
  'recordType.establishment': 'vestiging',
  'type.enterprise': 'Onderneming',
  'type.establishment': 'Vestiging',

  'kind.status_change': 'Statuswijziging',
  'kind.address_check': 'Adres nazien',
  'kind.missing_establishment': 'Vestiging ontbreekt',
  'kind.field_correction': 'Veldcorrectie',

  'weight.sterk': 'sterk',
  'weight.matig': 'matig',
  'weight.zwak': 'zwak',
  'direction.positief': 'positief',
  'direction.negatief': 'negatief',
  'direction.neutraal': 'neutraal',

  // Backend register_label values ("Actief" / "Niet actief" / "—").
  'register.actief': 'Actief',
  'register.niet_actief': 'Niet actief',
  'activitySource.waarneming': 'waarneming',

  // Sector keys from backend/app/activity.py (NL label comes from the backend; EN maps client-side).
  'sector.detailhandel': 'Detailhandel',
  'sector.horeca': 'Horeca',
  'sector.zorg': 'Gezondheidszorg',
  'sector.persoonlijke_diensten': 'Persoonlijke diensten (kapsalons, schoonheid…)',
  'sector.garages': 'Garages en autohandel',
  'sector.vastgoed': 'Vastgoed',
  'sector.bouw': 'Bouw',
  'sector.zakelijke_diensten': 'Zakelijke diensten',
  'sector.onderwijs': 'Onderwijs',
  'sector.verenigingen': 'Verenigingen',
  'sector.overheid_welzijn': 'Overheid en welzijn',
  'sector.industrie': 'Industrie',
  'sector.groothandel': 'Groothandel',
  'sector.transport': 'Transport en logistiek',
  'sector.ict': 'ICT',
  'sector.financieel': 'Financiële diensten',
  'sector.overige': 'Overige',
  'sector.onbekend': 'Onbekend',
  // Google Maps listing match (TICKET-035).
  'mapsMatch.adres': 'adres en naam kloppen',
  'mapsMatch.adres_andere_naam': 'adres klopt, andere naam',
  'mapsMatch.naam': 'enkel naam',
  'mapsMatch.geen': 'geen match',
} as const
