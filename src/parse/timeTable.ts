import cp from "../lib/cellPos";
import { WorkBook } from "xlsx/types";
import Ipair from "../interfaces/pair";

const testing = [
  {
    x: 1,
    y: 6,
    t: "Нечетная неделя"
  }
];

const exist = (sheet, x, y) => {
  return sheet[cp(x, y)] !== undefined;
};

const groupName = sheet => {
  try {
    return sheet[cp(1, 5)].v
      .replace("Расписание группы ", "")
      .split("/")[0]
      .toLowerCase();
  } catch (error) {
    throw Error("Not found group name in file");
  }
};

const checkStatic = (sheet, test) => {
  for (const e of test) {
    if (exist(sheet, e.x, e.y) && sheet[cp(e.x, e.y)].v !== e.t) {
      throw Error(`Not found ${e.t}`);
    }
  }
};

const findRow = (sheet, text, startFrom = 1, x = 1, limit = 100) => {
  // const end = false;

  for (let y = startFrom; y < limit; y += 1) {
    if (exist(sheet, x, y) && sheet[cp(x, y)].v === text) {
      return y;
    }
  }
  return -1;
};

const readSubgroup = (sheet, x, y) => {
  return {
    name: sheet[cp(x, y)].v,
    teacher: sheet[cp(x, y + 1)].v,
    classroom: sheet[cp(x + 1, y + 1)] ? sheet[cp(x + 1, y + 1)].v : -1
  };
};

const readGroup = (sheet, x, y) => {
  return {
    name: sheet[cp(x, y)].v,
    teacher: sheet[cp(x, y + 1)].v,
    classroom: sheet[cp(x + 3, y + 1)] ? sheet[cp(x + 3, y + 1)].v : -1
  };
};

const readBlock = (sheet, x, y) => {
  try {
    if (exist(sheet, x, y)) {
      const block = [];

      if (
        // Пара у первой и второй подгруппы
        exist(sheet, x + 1, y) &&
        !exist(sheet, x + 2, y + 1) &&
        exist(sheet, x + 4, y + 1)
      ) {
        block.push({
          number: sheet[cp(x, y)].v,
          subgroup: "common",
          ...readGroup(sheet, x + 1, y)
        });
      } else {
        if (
          // Пара у первой подгруппы
          exist(sheet, x + 1, y) &&
          exist(sheet, x + 2, y + 1)
        ) {
          block.push({
            number: sheet[cp(x, y)].v,
            subgroup: "first",
            ...readSubgroup(sheet, x + 1, y)
          });
        }

        if (
          // Пара у вторйо подгруппы
          exist(sheet, x + 3, y)
        ) {
          block.push({
            number: sheet[cp(x, y)].v,
            subgroup: "second",
            ...readSubgroup(sheet, x + 3, y)
          });
        }
      }
      for (let i = 0; i < 1; i += 1) {
        if (
          block[i] &&
          block[i].teacher &&
          block[i].teacher.indexOf(".") === -1
        ) {
          throw Error(block[i].teacher);
        }
      }

      return block;
    }
    return false;
  } catch (error) {
    console.log(`Проблемы с парой  ${x}, ${y}, ${error.message}`);
    return [];
  }
};

const readDay = (sheet, x, from, to) => {
  const day = [];
  for (let i = from; i < to; i += 2) {
    const block = readBlock(sheet, x, i);
    if (block) {
      day.push(...block);
      // day[block.number] = block;
    }
  }
  return day;
};

interface Itimetable {
  [index: number]: Array<Ipair>;
}

export default (
  file: string,
  book: WorkBook
): { name: string; timetable: Itimetable } => {
  const sheet = book.Sheets[book.SheetNames[0]];

  const name = groupName(sheet);

  if (
    name !==
    file
      .replace(".xlsx", "")
      .split(" ")[0]
      .toLowerCase()
  ) {
    throw Error(`Group name in file (${name}) not equil with filename`);
  }

  checkStatic(sheet, testing);

  const rows = {};
  for (let row = 1; row <= 4; row += 1) {
    rows[row] = findRow(
      sheet,
      row % 2 === 1 ? "Понедельник" : "Четверг",
      rows[row - 1 !== undefined ? row - 1 : 1]
    );
  }

  const timetable = {};

  for (let row = 1; row <= 4; row += 1) {
    timetable[row] = {};
    for (let three = 0; three <= 2; three += 1) {
      timetable[row][three] = readDay(
        sheet,
        6 * three + 1,
        rows[row] + 1,
        rows[row + 1] !== undefined ? rows[row + 1] : 100
      );
    }
  }

  return { name, timetable };
};