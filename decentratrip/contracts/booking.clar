;; Booking Contract for Hotels and Flights

(define-data-var admin principal tx-sender)

;; Struct to represent a booking
(define-map bookings
  uint
  {
    user: principal,
    provider: principal,
    booking-type: (string-utf8 16), ;; "hotel" or "flight"
    status: (string-utf8 16),        ;; "booked", "cancelled", etc.
    amount: uint,
    timestamp: uint
  }
)

;; Booking ID tracker
(define-data-var last-id uint u0)

;; Constants
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-NOT-FOUND u101)
(define-constant ERR-ALREADY-CANCELLED u102)

;; Only admin can perform
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Create a new booking (user calls this)
(define-public (create-booking (provider principal) (booking-type (string-utf8 16)) (amount uint))
  (let
    (
      (id (+ u1 (var-get last-id)))
      (now block-height)
    )
    (begin
      (map-set bookings id {
        user: tx-sender,
        provider: provider,
        booking-type: booking-type,
        status: "booked",
        amount: amount,
        timestamp: now
      })
      (var-set last-id id)
      (ok id)
    )
  )
)

;; Cancel a booking (only user who booked can cancel)
(define-public (cancel-booking (id uint))
  (let
    (
      (booking (map-get? bookings id))
    )
    (match booking
      some b
        (begin
          (asserts! (is-eq tx-sender (get user b)) (err ERR-NOT-AUTHORIZED))
          (asserts! (is-eq (get status b) "booked") (err ERR-ALREADY-CANCELLED))
          (map-set bookings id (merge b { status: "cancelled" }))
          (ok true)
        )
      none (err ERR-NOT-FOUND)
    )
  )
)

;; Read booking by ID
(define-read-only (get-booking (id uint))
  (map-get? bookings id)
)

;; Admin can update status manually (e.g., completed, refunded)
(define-public (update-status (id uint) (new-status (string-utf8 16)))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (match (map-get? bookings id)
      some b
        (begin
          (map-set bookings id (merge b { status: new-status }))
          (ok true)
        )
      none (err ERR-NOT-FOUND)
    )
  )
)

;; Transfer admin role
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set admin new-admin)
    (ok true)
  )
)
