function create_header() {
  const header = { size: 0 };
  header.up = header;
  header.down = header;
  header.left = header;
  header.right = header;
  return header;
}

function create_node(header, label) {
  const node = { header, label };
  node.up = node;
  node.down = node;
  node.left = node;
  node.right = node;
  return node;
}

function insert_up(node, other) {
  other.down = node;
  other.up = node.up;
  node.up.down = other;
  node.up = other;
}

function insert_left(node, other) {
  other.right = node;
  other.left = node.left;
  node.left.right = other;
  node.left = other;
}

function unlink_ud(node) {
  node.up.down = node.down;
  node.down.up = node.up;
  node.header.size--;
}

function unlink_lr(node) {
  node.left.right = node.right;
  node.right.left = node.left;
}

function relink_ud(node) {
  node.up.down = node;
  node.down.up = node;
  node.header.size++;
}

function relink_lr(node) {
  node.left.right = node;
  node.right.left = node;
}

function* iter(dir, start) {
  let node = start;
  do {
    yield node;
    node = node[dir];
  } while (node !== start);
}

function is_solved(dlx) {
  return dlx === dlx.right;
}

function* skip(n, it) {
  while (n--) {
    it.next();
  }
  yield* it;
}

function min_size_col(dlx) {
  return [...skip(1, iter("right", dlx))].reduce((prev, header) =>
    prev.size > header.size ? header : prev
  );
}

function cover(selected) {
  for (const node of iter("right", selected)) {
    const header = node.header;
    unlink_lr(header);
    for (const col_node of skip(1, iter("down", node))) {
      if (col_node === header) {
        continue;
      }
      for (const row_node of skip(1, iter("right", col_node))) {
        unlink_ud(row_node);
      }
    }
  }
}

function uncover(selected) {
  for (const node of iter("left", selected.left)) {
    const header = node.header;
    relink_lr(header);
    for (const col_node of skip(1, iter("up", node))) {
      if (col_node === header) {
        continue;
      }
      for (const row_node of skip(1, iter("left", col_node))) {
        relink_ud(row_node);
      }
    }
  }
}

function solve(dlx) {
  const labels = new Set();
  function solve_sub() {
    if (is_solved(dlx)) {
      throw "solved";
    }
    const header = min_size_col(dlx);
    for (const node of skip(1, iter("down", header))) {
      let label = node.label;
      labels.add(label);
      cover(node);
      solve_sub();
      uncover(node);
      labels.delete(label);
    }
  }
  try {
    solve_sub();
  } catch {
    return labels;
  }
}

function create_dlx(problem) {
  const headers = new Map();
  const root = create_header();

  for (const [label, subset] of problem) {
    let row_header = null;

    for (const elem of subset) {
      let col_header = headers.get(elem);
      if (!col_header) {
        col_header = create_header();
        headers.set(elem, col_header);
        insert_left(root, col_header);
      }

      const node = create_node(col_header, label);
      if (row_header) {
        insert_left(row_header, node);
      } else {
        row_header = node;
      }

      insert_up(col_header, node);
      col_header.size++;
    }
  }

  return root;
}

function solve_sudoku(size, get_num) {
  const sqrt = Math.sqrt(size);
  function* problem() {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const num = get_num(r, c);
        for (let n = 1; n <= size; n++) {
          if (num !== null && n !== num) {
            continue;
          }
          const b = sqrt * Math.floor(r / sqrt) + Math.floor(c / sqrt);
          yield [
            `R${r}C${c}N${n}`,
            [`R${r}C${c}`, `R${r}N${n}`, `C${c}N${n}`, `B${b}N${n}`],
          ];
        }
      }
    }
  }

  const solution = solve(create_dlx(problem()));
  if (!solution) {
    return null;
  }

  const solutionArr = [...solution].sort();
  return (r, c) => Number(solutionArr[size * r + c].split("N")[1]);
}

function prepare_table(size, table) {
  table.replaceChildren();

  const sqrt = Math.sqrt(size);
  const map = new Map();

  for (let r = 0; r < size; r++) {
    const row = table.appendChild(document.createElement("tr"));
    if ((r + 1) % sqrt === 0) {
      row.classList.add("border-bottom");
    }
    for (let c = 0; c < size; c++) {
      const cell = row.appendChild(document.createElement("td"));
      if ((c + 1) % sqrt === 0) {
        cell.classList.add("border-right");
      }

      const input = cell.appendChild(document.createElement("input"));
      input.setAttribute("type", "number");
      input.setAttribute("min", "1");
      input.setAttribute("max", String(size));
      input.addEventListener("input", function () {
        if (Number(this.value) < 1 || Number(this.value) > size) {
          this.value = null;
        }
      });

      map.set(`R${r}C${c}`, input);
    }
  }
  return {
    get(r, c) {
      return Number(map.get(`R${r}C${c}`).value) || null;
    },
    set(r, c, n) {
      map.get(`R${r}C${c}`).value = n || "";
    },
    set_all(get_num) {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          this.set(r, c, get_num(r, c));
        }
      }
    },
    clear() {
      this.set_all(() => {});
    },
  };
}

window.addEventListener("load", () => {
  const size = 9;
  const grid = document.getElementById("grid");
  const table = prepare_table(size, grid);
  const msg = document.getElementById("msg");
  document.getElementById("solve").addEventListener("click", () => {
    msg.innerText = "";
    const start = performance.now();
    const solution = solve_sudoku(size, table.get);
    const end = performance.now();
    if (!solution) {
      msg.innerText = "No solution";
      return;
    }
    table.set_all(solution);
    msg.innerText = `Solved in ${Math.ceil(end - start)} msec.`;
  });
  document.getElementById("clear").addEventListener("click", () => {
    msg.innerText = "";
    table.clear();
  });
});
