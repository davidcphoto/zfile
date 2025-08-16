
       01 VARIABLES.
          05 VARIABLES-ALNUMERIC        PIC X(08).
          05 VARIABLES-NUMERIC          PIC 9(08).
          05 VARIABLES-ALNUMERIC REDEFINES VARIABLES-NUMERIC
                                        PIC X(08).
      *    comment
          05 VARIABLES-GROUP.
             10 VARIABLES-SIGNED-NUMERIC
                                        PIC S9(08).
             10 VARIABLES-COMP-NUMERIC  PIC S9(08) COMP.
             10 VARIABLES-GROUP2.
                15 VARIABLES-COMP-3-NUMERIC
                                        PIC S9(08)V9(2) COMP-3.
          05 VARIABLES-REDEFINES REDEFINES VARIABLES-GROUP.
             10 VARIABLES-FORMATED      PIC ----9.
             10 VARIABLES-BINARY        PIC S9(08) BINARY.
             10 FILLER                  PIC X(09).
          05 FILLER                     PIC X(10).
          05 VARIABLES-OCCURS OCCURS 5 TIMES
                                        PIC X(02).
          05 VARIABLES-GROUP-OCCURS OCCURS 5 TIMES.
             10 VARIABLES-GROUP-OCCURS-IN
                                        PIC X(02).
             10 VARIABLES-GROUP-OCCURS-IN2
                                        PIC X(02).
          05 FILLER                     PIC X(10).