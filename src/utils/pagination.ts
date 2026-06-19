export type PaginationItem = number | "ellipsis-left" | "ellipsis-right";

export function getPaginationItems(
  currentPage: number,
  totalPages: number,
  siblingCount = 1,
): PaginationItem[] {
  const total = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, currentPage), total);
  const visibleSlots = siblingCount * 2 + 5;

  if (total <= visibleSlots) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const leftSibling = Math.max(current - siblingCount, 2);
  const rightSibling = Math.min(current + siblingCount, total - 1);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < total - 1;
  const items: PaginationItem[] = [1];

  if (showLeftEllipsis) {
    items.push("ellipsis-left");
  } else {
    for (let page = 2; page < leftSibling; page += 1) {
      items.push(page);
    }
  }

  for (let page = leftSibling; page <= rightSibling; page += 1) {
    items.push(page);
  }

  if (showRightEllipsis) {
    items.push("ellipsis-right");
  } else {
    for (let page = rightSibling + 1; page < total; page += 1) {
      items.push(page);
    }
  }

  items.push(total);
  return items;
}
