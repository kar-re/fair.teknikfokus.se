import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { from, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Repository, TransactionManager, UpdateResult } from 'typeorm';
import { StudentUserEntity } from '../models/student_user.entity';
import { StudentUser } from '../models/student_user.interface';
import * as bcrypt from 'bcrypt';
import { ForgottenPasswordEntity } from '../models/forgotten_password.entity';

@Injectable()
export class StudentAuthService {
  private readonly logger = new Logger(StudentAuthService.name);

  hashPassword(password: string): Observable<string> {
    return from(bcrypt.hash(password, 12))
  }
  constructor(
    @InjectRepository(StudentUserEntity)
    private readonly studentRepository: Repository<StudentUserEntity>,

    @InjectRepository(ForgottenPasswordEntity)
    private readonly forgottenPasswordRepository: Repository<ForgottenPasswordEntity>,

    private jwtService: JwtService,
  ) { }


    doesUserExist(email: string): Observable<boolean> {
      email = email.toLocaleLowerCase();
      return from(this.studentRepository.findOne({ email})).pipe(
        switchMap((user: StudentUser) => {
          return of(!!user);
        }),
      );
    }

    findStudentUserById(id: number): Observable<StudentUser> {
      return from(
        this.studentRepository.findOne({ id }),
      ).pipe(
        map((user: StudentUser) => {
          if (!user) {
            throw new HttpException('Student not found', HttpStatus.NOT_FOUND);
          }
          delete user.password;
          return user;
        }),
      );
    }

    registerStudentAccount(user: StudentUser): Observable<StudentUser> {
      const {email, password } = user;
      const lowerEmail = email.toLocaleLowerCase();

      return this.doesUserExist(lowerEmail).pipe(
        tap((doesUserExist: boolean) => {
          if (doesUserExist)
            throw new HttpException(
              'A user has already been created with this email address',
              HttpStatus.BAD_REQUEST,
            );
        }),
        switchMap(() => {
          if((email.replace(/\s+/g, "").length) !== 24 || !email.includes('-s@student.lu.se')){
            throw new HttpException(
              { status: HttpStatus.FORBIDDEN, error: 'Email address has to be a valid LU-email' },
              HttpStatus.FORBIDDEN,
            );
          }
          return this.hashPassword(password).pipe(
            switchMap((hashedPassword: string) => {
              return from(
                this.studentRepository.save({
                  email: lowerEmail,
                  password: hashedPassword,
                }),
              ).pipe(
                map((user: StudentUser) => {
                  delete user.password;
                  return user;
                }),
              );
            }),
          );
        }),
      );
    }
    
    validateUser(email: string, password: string): Observable<StudentUser> {
      const lowerEmail = email.toLocaleLowerCase();
      return from(
        this.studentRepository.findOne(
          { email : lowerEmail},
          {
            select: ['id', 'email', 'password', 'student_profile_id'],
          },
        ),
      ).pipe(
        switchMap((user: StudentUser) => {
          if (!user) {
            throw new HttpException(
              { status: HttpStatus.FORBIDDEN, error: 'Invalid Credentials' },
              HttpStatus.FORBIDDEN,
            );
          }
          return from(bcrypt.compare(password, user.password)).pipe(
            map((isValidPassword: boolean) => {
              if (isValidPassword) {
                delete user.password;
                return user;
              }
              throw new HttpException(
                { status: HttpStatus.FORBIDDEN, error: 'Invalid Credentials' },
                HttpStatus.FORBIDDEN,
              );

            }),
          );
        }),
      );
    }
    login(user: StudentUser): Observable<string> {
      const { email, password } = user;
        return this.validateUser(email, password).pipe(
          switchMap((user: StudentUser) => {
            if (user) {
              // create JWT - credentials
              return from(this.jwtService.signAsync({ user: {...user, type: "student"} }));
            }
          }),
       );
     }
    
     getJwtUser(jwt: string): Observable<StudentUser | null> {
       return from(this.jwtService.verifyAsync(jwt)).pipe(
         map(({ user }: { user: StudentUser }) => {
           return user;
         }),
         catchError(() => {
           return of(null);
         }),
       );
     }
     createForgottenPasswordToken(email: string) {
      return from(this.doesUserExist(email).pipe(
        tap((doesUserExist: boolean) => {
          if (!doesUserExist) {
            this.logger.warn("Someone tried to generate forgotten password token for non-existant student user");
            return;
          }
  
          this.forgottenPasswordRepository.save({
            email,
            new_password_token: (Math.floor(Math.random() * (9000000)) + 1000000).toString(), //Generate 7 digits number,
            timestamp: new Date(),
          });
  
          this.logger.log("Succesfully generated forgotten password token");
        }),
        map(() => {
          return {
            "message": 'E-mail sent away with link to password',
            "statusCode": '201'
          };
        })
      ));
    }

     updateStudentProfileById(id: number, student_id: number): Observable<UpdateResult> {
      const user: StudentUser = new StudentUserEntity();
      user.id = id;
      user.student_profile_id = student_id;
      return from(this.studentRepository.update(id, user));
    }
  }