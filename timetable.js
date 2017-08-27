module.exports = class TimeTable {
    constructor(subjects) {
        this.subjects = subjects;
        this.timetable = [];
    }

    create() {
        var timetable = [];
        for(var i=0; i<5; i++) {
            var day = [];
            for(var j=0; j<25; j++) {
                day.push("0");
            }
            timetable.push(day);
        }

        this.insert(timetable, 0);

        var result = {
            count: this.timetable.length,
            result: []
        };

        for(var i in this.timetable) {
            result.result.push(this.reverse(this.timetable[i]));
        }
        return result;
    }

    reverse(table) {
        var timetable = [];
        for(var i=0; i<25; i++) {
            var day = [];
            for(var j=0; j<5; j++) {
                day.push("0");
            }
            timetable.push(day);
        }
        for(var j=0; j<table.length; j++) {
            for(var k=0; k<table[j].length; k++) {
                timetable[k][j] = table[j][k];
            }
        }
        return timetable;
    }


    // Deep Copy를 해주는 함수
    clone(obj) {
        if(obj === null || typeof(obj) !== 'object')
            return obj;

        var copy = obj.constructor();
        for(var attr in obj) {
            if(obj.hasOwnProperty(attr))
                copy[attr] = this.clone(obj[attr]);
        }
        return copy;
    }

    insert(timetable, index) {
        // 모든 강의를 확인했다면 해당 시간표를 저장
        if(index >= this.subjects.length) {
            this.timetable.push(timetable);
            return;
        }

        // 확인할 강의를 저장
        var subject = this.subjects[index];

        // 각 분반별 가능 여부 확인
        for(var i=0; i<subject["classes"].length; i++) {
            // 현재 시간표 복사 (원본 훼손 방지)
            var cur_timetable = this.clone(timetable);

            // 가능 여부
            var isPossible = true;

            // 각 시간별 가능 여부 확인
            var tmp_class = subject["classes"][i];
            for(var j=0; j<tmp_class["time"].length; j++) {
                // 각 요일별 가능 여부 확인
                var tmp_day = tmp_class["time"][j];
                for(var k=1; k<tmp_day.length; k++) {
                    if(cur_timetable[tmp_day[0]-1][tmp_day[k]-1] != "0") {
                        isPossible = false;
                        break;
                    }
                }
                // 요일 중 불가능이 있다면
                if(!isPossible) break;
            }

            // 불가능 하면 건너뜀
            if(!isPossible) continue;

            // 가능하면 시간표에 추가
            for(var j=0; j<tmp_class["time"].length; j++) {
                var tmp_day = tmp_class["time"][j];
                for(var k=1; k<tmp_day.length; k++) {
                    cur_timetable[tmp_day[0]-1][tmp_day[k]-1] = subject["subject"] + "-" + tmp_class["class"];
                }
            }

            // 다음 강의로 재귀호출
            this.insert(cur_timetable, index+1);
        }
    }
}
