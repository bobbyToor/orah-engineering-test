import { getRepository, getManager, LessThan, MoreThan, In } from "typeorm"
import { NextFunction, Request, Response } from "express"
import { Group } from "../entity/group.entity"
import { GroupStudent } from "../entity/group-student.entity"
import { Student } from "../entity/student.entity"
import { StudentRollState } from "../entity/student-roll-state.entity"
import { Roll } from "../entity/roll.entity"
import { CreateGroupInput, UpdateGroupInput } from "../interface/group.interface"
import { CreateGroupStudentInput } from "../interface/group-student.interface"

export class GroupController {
  private groupRepository = getRepository(Group)
  private groupStudentRepository = getRepository(GroupStudent)
  private studentRepository = getRepository(Student)

  async allGroups(request: Request, response: Response, next: NextFunction) {
    return this.groupRepository.find()
  }

  async createGroup(request: Request, response: Response, next: NextFunction) {
    // TODO: throw error upon invalid input

    const { body: params } = request

    const createGroupInput: CreateGroupInput = {
      name: params.name,
      number_of_weeks: params.number_of_weeks,
      roll_states: params.roll_states,
      incidents: params.incidents,
      ltmt: params.ltmt,
    }

    const group = new Group()
    group.prepareToCreate(createGroupInput)

    return this.groupRepository.save(group)
  }

  async updateGroup(request: Request, response: Response, next: NextFunction) {
    // TODO: throw error upon invalid input

    const { body: params } = request

    return this.groupRepository.findOne(params.id).then((group) => {
      if (!group) return {}

      const updateGroupInput: UpdateGroupInput = {
        id: params.id,
        name: params.name,
        number_of_weeks: params.number_of_weeks,
        roll_states: params.roll_states,
        incidents: params.incidents,
        ltmt: params.ltmt,
      }

      group.prepareToUpdate(updateGroupInput)

      return this.groupRepository.save(group)
    })
  }

  async removeGroup(request: Request, response: Response, next: NextFunction) {
    // TODO: throw error upon invalid input

    await this.groupRepository.delete({ id: request.params.id })

    return {}
  }

  async getGroupStudents(request: Request, response: Response, next: NextFunction) {
    /* 
      ideal way to do this would be to 
      create a many to one relationship 
      between student_group and student tables 
    */
    const groupId = request.params.id

    /* fetch student ids from group */
    const groupStudents = await this.groupStudentRepository.find({ group_id: groupId })
    const studentIds = groupStudents.map((groupStudent) => groupStudent.student_id)

    /* fetch students */
    const students = await this.studentRepository.findByIds(studentIds)

    /* generate response */
    const studentsData = students.map((student) => {
      return { first_name: student.first_name, last_name: student.last_name, full_name: student.first_name + " " + student.last_name }
    })

    return studentsData
  }

  async runGroupFilters(request: Request, response: Response, next: NextFunction) {
    /* create a transaction */
    return getManager().transaction(async (transaction) => {
      /* get repositories */
      const groupRepository = transaction.getRepository(Group)
      const groupStudentRepository = transaction.getRepository(GroupStudent)
      const studentRollStateRepository = transaction.getRepository(StudentRollState)
      const studentRepository = transaction.getRepository(Student)
      const rollRepository = transaction.getRepository(Roll)

      // 1. Clear out the groups (delete all the students from the groups)
      await groupStudentRepository.clear()

      // 2. For each group, query the student rolls to see which students match the filter for the group

      /* fetch all groups */
      const groups = await groupRepository.find()

      for await (const group of groups) {
        const groupId = group.id

        /* fetch rolls from the last n weeks */
        const queryDate = new Date()
        const numberOfWeeks = group.number_of_weeks
        queryDate.setDate(queryDate.getDate() - numberOfWeeks * 7)

        const matchingRolls = await rollRepository.find({ completed_at: MoreThan(queryDate) })
        const matchingRollsIds = matchingRolls.map((roll) => roll.id)

        /* fetch student roll states from roll ids and roll states */
        const rollStates = group.roll_states
        const rolls = rollStates.split(",")

        const studentRollStates = await studentRollStateRepository.find({ roll_id: In(matchingRollsIds), state: In(rolls) })

        /* collect total incidents */
        const incidentsObj = {}

        for (const studentRollState of studentRollStates) {
          incidentsObj[studentRollState.student_id] = 0
        }
        for (const studentRollState of studentRollStates) {
          incidentsObj[studentRollState.student_id] += 1
        }

        /* filter based on incidents */
        const ltmt = group.ltmt
        const incidents = group.incidents

        const filteredStudents = {}

        for (let studentId in incidentsObj) {
          let totalIncidents = incidentsObj[studentId]

          if (ltmt === ">") {
            if (totalIncidents > incidents) {
              filteredStudents[studentId] = totalIncidents
            }
          } else {
            if (totalIncidents < incidents) {
              filteredStudents[studentId] = totalIncidents
            }
          }
        }

        const groupStudents: GroupStudent[] = []

        // for (let studentId in filteredStudents) {
        //   let totalIncidents = filteredStudents[studentId]

        //   const createGroupStudentInput: CreateGroupStudentInput = {
        //     student_id: studentId,
        //     group_id: groupId,
        //     incident_count: totalIncidents,
        //   }
        //   groupStudents.push({})
        // }
      }

      // 3. Add the list of students that match the filter to the group
    })
  }
}
