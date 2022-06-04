let rolls = [{
    "name": "roll 1 last week",
    "completed_at": "2022/05/25"
}, {
    "name": "roll 2 last week",
    "completed_at": "2022/05/26"
}, {
    "name": "roll 3 this week",
    "completed_at": "2022/06/03"
}, {
    "name": "roll 4 this week",
    "completed_at": "2022/06/04"
}]




let groups = [
    // 1. absent atleast once this week - 1 ([roll 3, student 1])
    {
        "name": "absent atleast once this week",
        "number_of_weeks": 1,
        "roll_states": "absent",
        "incidents": 0,
        "ltmt": ">"
    },
    // 2. absent atleast once last 2 weeks - 4 ([roll 3, student 1], [roll1, student 2], [roll 2, student 3], [roll 2, student 4])
    {
        "name": "absent atleast once last 2 weeks",
        "number_of_weeks": 2,
        "roll_states": "absent",
        "incidents": 0,
        "ltmt": ">"
    },
    // 3. late atleast once this week - 1 ([roll 3, student 5])
    {
        "name": "late atleast once this week",
        "number_of_weeks": 1,
        "roll_states": "late",
        "incidents": 0,
        "ltmt": ">"
    },
    // 4. late, present atleast once this week - 2 ([roll 3, student 5], [roll 4, student 6])
    {
        "name": "late, present atleast once this week",
        "number_of_weeks": 1,
        "roll_states": "late,present",
        "incidents": 0,
        "ltmt": ">"
    },
    // 5. unmarked less than twice this week - 2 ([roll 3, student 6], [roll 4, student 7])
    {
        "name": "unmarked less than twice this week",
        "number_of_weeks": 1,
        "roll_states": "unmarked",
        "incidents": 2,
        "ltmt": "<"
    },
    // 6. unmarked less than twice since last week - 1 ([roll 3, student 6]) // roll 4 student 7 was unmarked previous week too
    {
        "name": "unmarked less than twice this week",
        "number_of_weeks": 2,
        "roll_states": "unmarked",
        "incidents": 2,
        "ltmt": "<"
    }
]




let rollStates = [
    // group 1, group 2
    {
        "roll_id": 3,
        "student_id": 1,
        "state": "absent"
    },
    {
        "roll_id": 1,
        "student_id": 2,
        "state": "absent"
    },
    {
        "roll_id": 2,
        "student_id": 3,
        "state": "absent"
    },
    {
        "roll_id": 2,
        "student_id": 4,
        "state": "absent"
    },

    // group 3,4
    {
        "roll_id": 3,
        "student_id": 5,
        "state": "late"
    },
    {
        "roll_id": 4,
        "student_id": 6,
        "state": "present"
    },

    // group 5,6
    {
        "roll_id": 3,
        "student_id": 6,
        "state": "unmarked"
    },
    {
        "roll_id": 4,
        "student_id": 7,
        "state": "unmarked"
    },
    {
        "roll_id": 2,
        "student_id": 7,
        "state": "unmarked"
    }
]