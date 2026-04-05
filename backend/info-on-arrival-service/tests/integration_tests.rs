use info_on_arrival_service::domain::{CardType, InfoCard, InfoLink, LinkType};

/// Verify that InfoCard can be serialized to JSON and deserialized back,
/// simulating what the service endpoints return.
#[test]
fn test_info_card_json_contract() {
    let card = InfoCard::new(
        CardType::MeridaAttractions,
        "Qué ver en Mérida".to_string(),
        "Descubre los tesoros romanos".to_string(),
    )
    .with_links(vec![InfoLink {
        title: "Teatro Romano".to_string(),
        url: "https://www.consorciomerida.org/teatro-romano".to_string(),
        description: Some("Espectacular teatro".to_string()),
        link_type: LinkType::Website,
        phone: None,
        address: None,
        rating: None,
        price_range: None,
    }])
    .with_priority(1);

    let json = serde_json::to_string(&card).unwrap();

    // Verify JSON contains expected fields
    assert!(json.contains("MeridaAttractions"));
    assert!(json.contains("Teatro Romano"));
    assert!(json.contains("priority"));

    // Verify it deserializes back
    let back: InfoCard = serde_json::from_str(&json).unwrap();
    assert_eq!(back.card_type, CardType::MeridaAttractions);
    assert_eq!(back.links.len(), 1);
}

/// Verify a list of InfoCards serializes/deserializes (mimics get_all_info_cards response)
#[test]
fn test_info_card_list_json_contract() {
    let cards = vec![
        InfoCard::new(
            CardType::EmergencyContacts,
            "Emergencias".to_string(),
            "112".to_string(),
        )
        .with_priority(10),
        InfoCard::new(
            CardType::RestaurantsEat,
            "Restaurants".to_string(),
            "Food".to_string(),
        )
        .with_priority(4),
    ];

    let json = serde_json::to_string(&cards).unwrap();
    let back: Vec<InfoCard> = serde_json::from_str(&json).unwrap();
    assert_eq!(back.len(), 2);
    assert_eq!(back[0].card_type, CardType::EmergencyContacts);
    assert_eq!(back[1].card_type, CardType::RestaurantsEat);
}

/// Verify restaurant link structure matches expected contract
#[test]
fn test_restaurant_link_structure() {
    let link = InfoLink {
        title: "Restaurante Rex Numitor".to_string(),
        url: "https://turismomerida.org/donde-comer/".to_string(),
        description: Some("Cocina extremeña".to_string()),
        link_type: LinkType::Restaurant,
        phone: Some("+34 924 314 261".to_string()),
        address: Some("Calle de José Ramón Mélida, 06800 Mérida".to_string()),
        rating: Some(4.3),
        price_range: Some("25-35€ por persona".to_string()),
    };

    let json = serde_json::to_string(&link).unwrap();
    let back: InfoLink = serde_json::from_str(&json).unwrap();

    assert_eq!(back.link_type, LinkType::Restaurant);
    assert!(back.phone.is_some());
    assert!(back.address.is_some());
    assert!(back.rating.is_some());
    assert!(back.price_range.is_some());
}

/// Verify emergency contact card has expected structure for clients
#[test]
fn test_emergency_card_contract() {
    let card = InfoCard::new(
        CardType::EmergencyContacts,
        "Emergencias y Contactos Útiles".to_string(),
        "Números importantes".to_string(),
    )
    .with_links(vec![
        InfoLink {
            title: "Emergencias".to_string(),
            url: "tel:112".to_string(),
            description: Some("24h".to_string()),
            link_type: LinkType::Emergency,
            phone: None,
            address: None,
            rating: None,
            price_range: None,
        },
        InfoLink {
            title: "Guardia Civil".to_string(),
            url: "tel:062".to_string(),
            description: Some("24h".to_string()),
            link_type: LinkType::Emergency,
            phone: None,
            address: None,
            rating: None,
            price_range: None,
        },
    ])
    .with_priority(10);

    let json = serde_json::to_string(&card).unwrap();
    let back: InfoCard = serde_json::from_str(&json).unwrap();

    assert_eq!(back.priority, 10);
    assert!(back.links.iter().all(|l| l.url.starts_with("tel:")));
}

/// Verify that the card sorting by priority works as expected by clients
#[test]
fn test_cards_sort_by_priority_descending() {
    #[allow(clippy::useless_vec)]
    let mut cards = vec![
        InfoCard::new(CardType::CaminoTips, "Tips".to_string(), "C".to_string()).with_priority(1),
        InfoCard::new(
            CardType::EmergencyContacts,
            "Emergency".to_string(),
            "C".to_string(),
        )
        .with_priority(10),
        InfoCard::new(CardType::TaxiServices, "Taxi".to_string(), "C".to_string()).with_priority(6),
    ];

    cards.sort_by(|a, b| b.priority.cmp(&a.priority));

    assert_eq!(cards[0].priority, 10);
    assert_eq!(cards[1].priority, 6);
    assert_eq!(cards[2].priority, 1);
}
