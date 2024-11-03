/**
 * Finds path by using A* method
 *
 * @param array
 */
export function Astar(grid) {
  let nodes = [];
  let openset = [];

  /**
   * Initializes all nodes
   *
   * @param integer
   * @param integer
   */
  function init(startX, startY) {
    for (let i = 0; i < 9; i++) {
      nodes[i] = [];
      for (let j = 0; j < 9; j++) {
        nodes[i][j] = {
          obstacle: grid[i][j],
          parent: 0,
          f: 0,
          g: 0,
          h: 0,
          x: j,
          y: i,
          closed: false,
        };
      }
    }

    // Adds start node to the openset
    openset.push(nodes[startY][startX]);
  }

  /**
   * Finds the path
   *
   * @param integer
   * @param integer
   * @param integer
   * @param integer
   * @return array|bool
   */
  function find(startX, startY, endX, endY) {
    init(startX, startY);

    // Goes through all open nodes
    while (openset.length) {
      let index = 0;

      // Finds the node index with the highest F value
      for (let i = 0; i < openset.length; i++) {
        if (openset[i].f < openset[index].f) {
          index = i;
        }
      }

      let currentNode = openset[index];

      // Checks if the end node is reached
      if (currentNode.x == endX && currentNode.y == endY) {
        return reconstructPath(currentNode);
      }

      // Removes current node from openlist and sets it as closed
      openset.splice(index, 1);
      currentNode.closed = true;

      // Get all adjecent nodes
      let neighbors = getNeighbors(currentNode);
      for (let i = 0; i < neighbors.length; i++) {
        let neighbor = neighbors[i];

        // Checks if adjecent node is closed or it's not walkable
        if (neighbor.closed || neighbor.obstacle != 0) {
          continue;
        }

        let g = currentNode.g + 1,
          gIsBest = false;

        // Checks if node isn't opened yet
        if (!isOpened(neighbor)) {
          gIsBest = true;
          neighbor.h =
            Math.abs(neighbor.x - endX) + Math.abs(neighbor.y - endY);
          openset.push(neighbor);
        } else if (g < neighbor.g) {
          gIsBest = true;
        }

        if (gIsBest) {
          neighbor.parent = currentNode;
          neighbor.g = g;
          neighbor.f = neighbor.g + neighbor.h;
        }
      }
    }

    // Path is not found
    return false;
  }

  /**
   * Reconstructs path
   *
   * @param object
   * @return array
   */
  function reconstructPath(node) {
    let path = [];
    while (node.parent) {
      path.push(node);
      node = node.parent;
    }

    return path.reverse();
  }

  /**
   * Gets neighbor nodes
   *
   * @param object
   * @return array
   */
  function getNeighbors(node) {
    let neighbors = [],
      x = node.x,
      y = node.y;

    if (y - 1 >= 0) {
      neighbors.push(nodes[y - 1][x]);
    }
    if (y + 1 <= 8) {
      neighbors.push(nodes[y + 1][x]);
    }
    if (x - 1 >= 0) {
      neighbors.push(nodes[y][x - 1]);
    }
    if (x + 1 <= 8) {
      neighbors.push(nodes[y][x + 1]);
    }

    return neighbors;
  }

  /**
   * Checks if node is opened
   *
   * @param object
   * @return array
   */
  function isOpened(node) {
    for (let i = 0; i < openset.length; i++) {
      if (openset[i].x == node.x && openset[i].y == node.y) {
        return true;
      }
    }

    return false;
  }

  /**
   * Returns public methods
   */
  return {
    find: find,
  };
}
