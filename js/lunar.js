/**
 * THUẬT TOÁN ÂM - DƯƠNG LỊCH VIỆT NAM (HỒ NGỌC ĐỨC)
 * Tích hợp tính toán chuyển đổi ngày Dương sang Âm và ngược lại,
 * tính toán Can Chi, Lịch Kỵ Nhật (Ngày giỗ) và đếm ngược thời gian.
 */

const LunarHelper = (function() {
    'use strict';

    // Bảng dữ liệu thiên văn (Hồ Ngọc Đức)
    const PI = Math.PI;

    function INT(d) {
        return Math.floor(d);
    }

    function jdFromDate(dd, mm, yy) {
        let a = INT((14 - mm) / 12);
        let y = yy + 4800 - a;
        let m = mm + 12 * a - 3;
        let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
        if (jd < 2299161) {
            jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
        }
        return jd;
    }

    function jdToDate(jd) {
        let a, b, c, d, e, m, day, month, year;
        if (jd > 2299160) {
            a = jd + 32044;
            b = INT((4 * a + 3) / 146097);
            c = a - INT((146097 * b) / 4);
            d = INT((4 * c + 3) / 1461);
            e = c - INT((1461 * d) / 4);
            m = INT((5 * e + 2) / 153);
            day = e - INT((153 * m + 2) / 5) + 1;
            month = m + 3 - 12 * INT(m / 10);
            year = 100 * b + d - 4800 + INT(m / 10);
        } else {
            b = 0;
            c = jd + 32082;
            d = INT((4 * c + 3) / 1461);
            e = c - INT((1461 * d) / 4);
            m = INT((5 * e + 2) / 153);
            day = e - INT((153 * m + 2) / 5) + 1;
            month = m + 3 - 12 * INT(m / 10);
            year = d - 4800 + INT(m / 10);
        }
        return [day, month, year];
    }

    function getNewMoonDay(k, timeZone) {
        let T = k / 1236.85;
        let T2 = T * T;
        let T3 = T2 * T;
        let dr = PI / 180;
        let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
        Jd1 = Jd1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
        let M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
        let Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
        let F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
        let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
        C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(2 * dr * Mpr);
        C1 = C1 - 0.0004 * Math.sin(3 * dr * Mpr);
        C1 = C1 + 0.0104 * Math.sin(2 * dr * F) - 0.0051 * Math.sin((M + Mpr) * dr);
        C1 = C1 - 0.0074 * Math.sin((M - Mpr) * dr) + 0.0004 * Math.sin((2 * F + M) * dr);
        C1 = C1 - 0.0004 * Math.sin((2 * F - M) * dr) - 0.0006 * Math.sin((2 * F + Mpr) * dr);
        C1 = C1 + 0.0010 * Math.sin((2 * F - Mpr) * dr) + 0.0005 * Math.sin((2 * Mpr + M) * dr);
        let deltat;
        if (T < -4) {
            deltat = 102.3 + 123.5 * T + 32.5 * T2;
        } else if (T < 0) {
            deltat = 102.3 + 37.8 * T + 4.8 * T2;
        } else {
            deltat = -0.00000001;
        }
        let JdNew = Jd1 + C1 - deltat / 86400;
        return INT(JdNew + 0.5 + timeZone / 24);
    }

    function getSunLongitude(dayNumber, timeZone) {
        let T = (dayNumber - 2451545.5 - timeZone / 24) / 36525;
        let T2 = T * T;
        let dr = PI / 180;
        let M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
        let L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
        let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
        DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
        let L = L0 + DL;
        L = L * dr;
        L = L - 2 * PI * INT(L / (2 * PI));
        return INT(L / PI * 6);
    }

    function getLunarMonth11(yy, timeZone) {
        let off = jdFromDate(31, 12, yy) - 2415021;
        let k = INT(off / 29.530588853);
        let nm = getNewMoonDay(k, timeZone);
        let sunLong = getSunLongitude(nm, timeZone);
        if (sunLong >= 9) {
            nm = getNewMoonDay(k - 1, timeZone);
        }
        return nm;
    }

    function getLeapMonthOffset(a11, timeZone) {
        let k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
        let last = 0;
        let i = 1;
        let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
        do {
            last = arc;
            i++;
            arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
        } while (arc !== last && i < 14);
        return i - 1;
    }

    /**
     * Chuyển ngày Dương lịch sang Âm lịch (Múi giờ Việt Nam +7)
     */
    function convertSolar2Lunar(dd, mm, yy, timeZone = 7) {
        let dayNumber = jdFromDate(dd, mm, yy);
        let k = INT((dayNumber - 2415021.076998695) / 29.530588853);
        let monthStart = getNewMoonDay(k + 1, timeZone);
        if (monthStart > dayNumber) {
            monthStart = getNewMoonDay(k, timeZone);
        }
        let a11 = getLunarMonth11(yy, timeZone);
        let b11 = a11;
        let lunarYear;
        if (a11 >= monthStart) {
            lunarYear = yy;
            a11 = getLunarMonth11(yy - 1, timeZone);
        } else {
            lunarYear = yy + 1;
            b11 = getLunarMonth11(yy + 1, timeZone);
        }
        let lunarDay = dayNumber - monthStart + 1;
        let diff = INT((monthStart - a11) / 29);
        let lunarLeap = 0;
        let lunarMonth = diff + 11;
        if (b11 - a11 > 365) {
            let leapMonthDiff = getLeapMonthOffset(a11, timeZone);
            if (diff >= leapMonthDiff) {
                lunarMonth = diff + 10;
                if (diff === leapMonthDiff) {
                    lunarLeap = 1;
                }
            }
        }
        if (lunarMonth > 12) {
            lunarMonth = lunarMonth - 12;
        }
        if (lunarMonth >= 11 && diff < 4) {
            lunarYear -= 1;
        }
        return [lunarDay, lunarMonth, lunarYear, lunarLeap];
    }

    /**
     * Chuyển ngày Âm lịch sang Dương lịch (Múi giờ Việt Nam +7)
     */
    function convertLunar2Solar(lunarDay, lunarMonth, lunarYear, lunarLeap = 0, timeZone = 7) {
        let a11;
        if (lunarMonth < 11) {
            a11 = getLunarMonth11(lunarYear - 1, timeZone);
        } else {
            a11 = getLunarMonth11(lunarYear, timeZone);
        }
        let k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
        let off = lunarMonth - 11;
        if (off < 0) {
            off += 12;
        }
        let b11 = getLunarMonth11(lunarYear, timeZone);
        if (lunarMonth >= 11) {
            b11 = getLunarMonth11(lunarYear + 1, timeZone);
        }
        if (b11 - a11 > 365) {
            let leapMonthDiff = getLeapMonthOffset(a11, timeZone);
            let leap = 0;
            if (lunarLeap === 1) {
                leap = 1;
            }
            if (off > leapMonthDiff || (off === leapMonthDiff && leap === 1)) {
                off += 1;
            }
        }
        let monthStart = getNewMoonDay(k + off, timeZone);
        return jdToDate(monthStart + lunarDay - 1);
    }

    // Tên Can - Chi
    const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
    const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];

    function getYearCanChi(year) {
        return CAN[(year + 6) % 10] + " " + CHI[(year + 8) % 12];
    }

    /**
     * Tính toán ngày giỗ Âm lịch trong năm hiện tại tương ứng ngày Dương lịch nào
     * và đếm ngược số ngày còn lại đến giỗ.
     */
    function getNextAnniversary(lunarDay, lunarMonth) {
        const today = new Date();
        const currentYear = today.getFullYear();

        // Thử tính ngày dương của năm nay
        let [sDay, sMonth, sYear] = convertLunar2Solar(lunarDay, lunarMonth, currentYear);
        let solarDate = new Date(sYear, sMonth - 1, sDay);

        // Đặt giờ về 0h00 để so sánh chính xác theo ngày
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        let diffMs = solarDate.getTime() - todayStart.getTime();
        let diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        // Nếu ngày giỗ năm nay đã qua hơn 1 ngày, tính sang ngày giỗ năm sau
        if (diffDays < 0) {
            [sDay, sMonth, sYear] = convertLunar2Solar(lunarDay, lunarMonth, currentYear + 1);
            solarDate = new Date(sYear, sMonth - 1, sDay);
            diffMs = solarDate.getTime() - todayStart.getTime();
            diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        }

        return {
            solarDay: sDay,
            solarMonth: sMonth,
            solarYear: sYear,
            solarDateStr: `${sDay}/${sMonth}/${sYear}`,
            diffDays: diffDays,
            isToday: diffDays === 0,
            isUpcoming: diffDays > 0 && diffDays <= 30
        };
    }

    return {
        convertSolar2Lunar,
        convertLunar2Solar,
        getYearCanChi,
        getNextAnniversary
    };
})();

window.LunarHelper = LunarHelper;
