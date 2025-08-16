// file: move/sources/event_ticketing.move
module event_owner::event_ticketing {
    use std::signer;
    use std::string::{Self, String};
    use aptos_framework::account;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use std::vector;
    use aptos_framework::object::{Self, Object, ConstructorRef, SignerCapability};
    use std::option::{Self, Option};

    // ========== Errors ==========
    const E_EVENT_DOES_NOT_EXIST: u64 = 1;
    const E_SOLD_OUT: u64 = 2;
    const E_INSUFFICIENT_PAYMENT: u64 = 3;
    const E_TICKET_NOT_OWNED: u64 = 4;
    const E_ALREADY_CHECKED_IN: u64 = 5;
    const E_TRANSFER_LIMIT_REACHED: u64 = 6;
    const E_NOT_AUTHORIZED: u64 = 7;

    // ========== Structs ==========

    // Represents a single event created by an organizer.
    struct Event has key {
        organizer: address,
        name: String,
        metadata_uri: String, // IPFS URI
        ticket_price: u64,
        total_supply: u64,
        minted: u64,
        max_transfers: u64,
        mutator_ref: object::MutatorRef, // Allows modifying this object
        signer_cap: SignerCapability,
    }

    // The NFT ticket itself. Stored as an Object.
    struct Ticket has key {
        event_address: address, // Address of the Event object
        ticket_id: u64,
        original_price: u64,
        transfers_made: u64,
        is_checked_in: bool,
    }

    // ========== Public Functions ==========

    // Creates a new event. Called by the organizer.
    public entry fun create_event(
        organizer: &signer,
        name: String,
        metadata_uri: String,
        ticket_price: u64,
        total_supply: u64,
        max_transfers: u64,
    ) {
        let constructor_ref = object::create_object(signer::address_of(organizer));
        let signer_cap = object::generate_signer_capability(&constructor_ref);
        let mutator_ref = object::generate_mutator_ref(&constructor_ref);
        
        let event = Event {
            organizer: signer::address_of(organizer),
            name,
            metadata_uri,
            ticket_price,
            total_supply,
            minted: 0,
            max_transfers,
            mutator_ref,
            signer_cap,
        };
        move_to(&constructor_ref, event);
    }

    // Mints a ticket for the caller.
    public entry fun mint_ticket(buyer: &signer, event_address: address, amount_paid: u64) {
        let buyer_addr = signer::address_of(buyer);
        
        // Acquire Event object and check conditions
        let event = borrow_global_mut<Event>(event_address);
        assert!(event.minted < event.total_supply, E_SOLD_OUT);
        assert!(amount_paid >= event.ticket_price, E_INSUFFICIENT_PAYMENT);

        // Transfer payment to organizer
        coin::transfer<AptosCoin>(buyer, event.organizer, event.ticket_price);
        
        // Create the Ticket NFT
        let constructor_ref = object::create_object(buyer_addr);
        let ticket_id = event.minted + 1;
        let ticket_nft = Ticket {
            event_address,
            ticket_id,
            original_price: event.ticket_price,
            transfers_made: 0,
            is_checked_in: false,
        };

        // Move the Ticket object to the buyer's account. It's now owned by them.
        move_to(&constructor_ref, ticket_nft);
        
        // Update event state
        event.minted = ticket_id;
    }

    // Transfers a ticket. Anti-scalping is enforced here.
    // In a real marketplace, the transfer would be part of a `list_for_sale` and `buy_from_listing` flow.
    // This is a simplified direct transfer. The price enforcement is conceptual.
    // The marketplace contract would be responsible for checking `ticket.original_price`.
    public entry fun transfer_ticket(owner: &signer, ticket_address: address, to: address) {
        let owner_addr = signer::address_of(owner);
        assert!(exists<Ticket>(ticket_address) && object::owner(ticket_address) == owner_addr, E_TICKET_NOT_OWNED);

        let ticket = borrow_global_mut<Ticket>(ticket_address);
        let event = borrow_global<Event>(ticket.event_address);

        assert!(ticket.transfers_made < event.max_transfers, E_TRANSFER_LIMIT_REACHED);

        ticket.transfers_made = ticket.transfers_made + 1;
        object::transfer(owner, ticket_address, to);
    }

    // Verifies and marks a ticket as checked in.
    // This function must be called by the event organizer.
    public entry fun check_in(organizer: &signer, ticket_address: address) {
        assert!(exists<Ticket>(ticket_address), E_TICKET_NOT_OWNED);
        
        let ticket = borrow_global_mut<Ticket>(ticket_address);
        let event = borrow_global<Event>(ticket.event_address);

        // Only the organizer can check people in
        assert!(signer::address_of(organizer) == event.organizer, E_NOT_AUTHORIZED);
        assert!(!ticket.is_checked_in, E_ALREADY_CHECKED_IN);

        ticket.is_checked_in = true;
    }

    // ========== View Functions ==========

    // Get event details
    #[view]
    public fun get_event_details(event_address: address): (String, String, u64, u64, u64) {
        let event = borrow_global<Event>(event_address);
        (
            event.name,
            event.metadata_uri,
            event.ticket_price,
            event.total_supply,
            event.minted
        )
    }

    // Get ticket details
    #[view]
    public fun get_ticket_details(ticket_address: address): (address, u64, u64, u64, bool) {
        let ticket = borrow_global<Ticket>(ticket_address);
        (
            ticket.event_address,
            ticket.ticket_id,
            ticket.original_price,
            ticket.transfers_made,
            ticket.is_checked_in
        )
    }
}