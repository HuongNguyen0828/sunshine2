"use strict";
// shared/types/type.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrollmentStatus = exports.TeacherStatus = void 0;
/* =============================
 * Teacher status
 * ============================= */
var TeacherStatus;
(function (TeacherStatus) {
    TeacherStatus["New"] = "\uD83C\uDD95 New";
    TeacherStatus["Active"] = "\u2705 Active";
    TeacherStatus["Inactive"] = "\uD83D\uDEAB Inactive";
})(TeacherStatus || (exports.TeacherStatus = TeacherStatus = {}));
/* =============================
 * Enrollment status
 * ============================= */
var EnrollmentStatus;
(function (EnrollmentStatus) {
    EnrollmentStatus["New"] = "New";
    EnrollmentStatus["Waitlist"] = "Waitlist";
    EnrollmentStatus["Active"] = "Active";
    EnrollmentStatus["Withdraw"] = "Withdraw";
})(EnrollmentStatus || (exports.EnrollmentStatus = EnrollmentStatus = {}));
//# sourceMappingURL=type.js.map