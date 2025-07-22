import { describe, it, expect, beforeEach } from "vitest";

const mockBookingContract = {
  admin: "ST000000000000000000002AMW42H",
  lastId: 0,
  bookings: new Map<number, any>(),

  isAdmin(caller: string) {
    return caller === this.admin;
  },

  createBooking(caller: string, provider: string, bookingType: string, amount: number) {
    const id = ++this.lastId;
    this.bookings.set(id, {
      user: caller,
      provider,
      bookingType,
      status: "booked",
      amount,
      timestamp: 1000, // mocked block-height
    });
    return { value: id };
  },

  cancelBooking(caller: string, id: number) {
    const booking = this.bookings.get(id);
    if (!booking) return { error: 101 }; // ERR-NOT-FOUND
    if (booking.user !== caller) return { error: 100 }; // ERR-NOT-AUTHORIZED
    if (booking.status !== "booked") return { error: 102 }; // ERR-ALREADY-CANCELLED
    booking.status = "cancelled";
    return { value: true };
  },

  updateStatus(caller: string, id: number, status: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    const booking = this.bookings.get(id);
    if (!booking) return { error: 101 };
    booking.status = status;
    return { value: true };
  },

  transferAdmin(caller: string, newAdmin: string) {
    if (!this.isAdmin(caller)) return { error: 100 };
    this.admin = newAdmin;
    return { value: true };
  },

  getBooking(id: number) {
    return this.bookings.get(id) ?? null;
  },
};

describe("Booking Contract", () => {
  const user = "ST1USER000000000000000000000000000000000";
  const provider = "ST1PROVIDER0000000000000000000000000000";
  const admin = mockBookingContract.admin;

  beforeEach(() => {
    mockBookingContract.lastId = 0;
    mockBookingContract.bookings = new Map();
    mockBookingContract.admin = admin;
  });

  it("should create a booking", () => {
    const result = mockBookingContract.createBooking(user, provider, "hotel", 500);
    expect(result).toHaveProperty("value");
    const booking = mockBookingContract.getBooking(result.value);
    expect(booking.user).toBe(user);
    expect(booking.status).toBe("booked");
  });

  it("should cancel a booking by the user", () => {
    const { value: id } = mockBookingContract.createBooking(user, provider, "flight", 200);
    const result = mockBookingContract.cancelBooking(user, id);
    expect(result).toEqual({ value: true });
    const booking = mockBookingContract.getBooking(id);
    expect(booking.status).toBe("cancelled");
  });

  it("should not cancel a booking by another user", () => {
    const { value: id } = mockBookingContract.createBooking(user, provider, "hotel", 300);
    const result = mockBookingContract.cancelBooking("ST3OTHERUSER", id);
    expect(result).toEqual({ error: 100 });
  });

  it("should update status by admin", () => {
    const { value: id } = mockBookingContract.createBooking(user, provider, "hotel", 600);
    const result = mockBookingContract.updateStatus(admin, id, "completed");
    expect(result).toEqual({ value: true });
    const booking = mockBookingContract.getBooking(id);
    expect(booking.status).toBe("completed");
  });

  it("should not update status if not admin", () => {
    const { value: id } = mockBookingContract.createBooking(user, provider, "flight", 750);
    const result = mockBookingContract.updateStatus("ST3NOTADMIN", id, "refunded");
    expect(result).toEqual({ error: 100 });
  });

  it("should transfer admin rights", () => {
    const newAdmin = "ST2NEWADMIN0000000000000000000000000000";
    const result = mockBookingContract.transferAdmin(admin, newAdmin);
    expect(result).toEqual({ value: true });
    expect(mockBookingContract.admin).toBe(newAdmin);
  });
});
