import { getRepository, getManager, MoreThan, In } from "typeorm"
import { NextFunction, Request, Response } from "express"
import { Group } from "../entity/group.entity"
import { GroupStudent } from "../entity/group-student.entity"
import { Student } from "../entity/student.entity"
import { StudentRollState } from "../entity/student-roll-state.entity"
import { Roll } from "../entity/roll.entity"
import { CreateGroupInput } from "../interface/group.interface"
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

    await this.groupRepository.update(
      { id: params.id },
      {
        name: params.name,
        number_of_weeks: params.number_of_weeks,
        roll_states: params.roll_states,
        incidents: params.incidents,
        ltmt: params.ltmt,

        /* reset these on update */
        student_count: 0,
        run_at: null,
      }
    )

    return { id: params.id }
  }

  async removeGroup(request: Request, response: Response, next: NextFunction) {
    // TODO: throw error upon invalid input

    await this.groupRepository.delete({ id: request.params.id })

    return { id: request.params.id }
  }

  async getGroupStudents(request: Request, response: Response, next: NextFunction) {
    /* 
      ideal way to do this would be to 
      create a many to one relationship 
      between student_group and student tables
      (this will reduce 2 db calls to 1)
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
      const rollRepository = transaction.getRepository(Roll)

      /* Clear out the groups (delete all the students from the groups) */
      await groupStudentRepository.clear()

      /* fetch all groups */
      const groups = await groupRepository.find()

      /* collect all students to insert at once */
      const groupStudentsInput: CreateGroupStudentInput[] = []

      /* iterate thriugh all groups to generate matching roll students */
      for await (const group of groups) {
        const groupId = group.id

        /* fetch rolls from the last n weeks */
        const queryDate = new Date()
        const numberOfWeeks = group.number_of_weeks
        queryDate.setDate(queryDate.getDate() - numberOfWeeks * 7)

        const matchingRolls = await rollRepository.find({ completed_at: MoreThan(queryDate.toISOString()) })
        const matchingRollsIds = matchingRolls.map((roll) => roll.id)

        /* fetch student roll states from roll ids and roll states */
        const rolls = group.roll_states.split(",")

        const studentRollStates = await studentRollStateRepository.find({ roll_id: In(matchingRollsIds), state: In(rolls) })

        /* collect total incident count per student */
        const incidentsObj = {}

        for (const studentRollState of studentRollStates) {
          incidentsObj[studentRollState.student_id] = 0
        }
        for (const studentRollState of studentRollStates) {
          incidentsObj[studentRollState.student_id] += 1
        }

        /* filter based on incident count & ltmt */
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

        /* create group student input object */
        for (const studentId in filteredStudents) {
          let totalIncidents = filteredStudents[studentId]

          const createGroupStudentInput: CreateGroupStudentInput = {
            student_id: parseInt(studentId),
            group_id: groupId,
            incident_count: totalIncidents,
          }

          groupStudentsInput.push(createGroupStudentInput)
        }

        /* update student count & group runtime for the group */
        const groupStudentCount = Object.keys(filteredStudents).length
        const groupRunTime = new Date().toISOString()

        await this.groupRepository.update({ id: groupId }, { run_at: groupRunTime, student_count: groupStudentCount })
      }

      /* save all group students at once */
      const groupStudents = groupStudentsInput.map((input) => {
        const groupStudent = new GroupStudent()
        groupStudent.prepareToCreate(input)

        return groupStudent
      })

      return groupStudentRepository.save(groupStudents)
    })
  }
}
