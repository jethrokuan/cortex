let pages = [window.location.pathname];
let switchDirectionWindowWidth = 900;
let animationLength = 200;

function stackNote(href, level) {
  level = Number(level) || pages.length;
  href = URI(href);
  uri = URI(window.location);
  pages.push(href.path());
  uri.setQuery("stackedNotes", pages.slice(1, pages.length));

  old_pages = pages.slice(0, level - 1);
  state = { pages: old_pages, level: level };
  window.history.pushState(state, "", uri.href());
}

function unstackNotes(level) {
  let container = document.querySelector(".grid");
  let children = Array.prototype.slice.call(container.children);

  for (let i = level; i < children.length; i++) {
    container.removeChild(children[i]);
  }
  pages = pages.slice(0, level);
}

function updateLinkStatuses() {
  links = Array.prototype.slice.call(document.querySelectorAll("a"));
  links.forEach(function (e) {
    if (pages.indexOf(e.getAttribute("href")) > -1) {
      e.classList.add("active");
    } else {
      e.classList.remove("active");
    }
  });
}

// Fetches note at href, and then removes all notes up to level, and inserts the new note
function fetchNote(href, level) {
  if (pages.indexOf(href) > -1) return;
  level = Number(level) || pages.length;

  const request = new Request(href);
  fetch(request)
    .then((response) => response.text())
    .then((text) => {
      unstackNotes(level);
      let container = document.querySelector(".grid");
      let fragment = document.createElement("template");
      fragment.innerHTML = text;
      let element = fragment.content.querySelector(".page");
      container.appendChild(element);
      stackNote(href, level);

      setTimeout(
        function (element, level) {
          element.dataset.level = level + 1;
          initializePage(element, level + 1);
          element.scrollIntoView();
          if (window.MathJax) {
            window.MathJax.typeset();
          }
        }.bind(null, element, level),
        10
      );
    });
}

function initializePage(page, level) {
  level = level || pages.length;

  links = Array.prototype.slice.call(page.querySelectorAll("a"));

  links.forEach(async function (element) {
    var rawHref = element.getAttribute("href");
    element.dataset.level = level;

    if (
      rawHref &&
      !(
        // Internal Links Only
        (
          rawHref.indexOf("http://") === 0 ||
          rawHref.indexOf("https://") === 0 ||
          rawHref.indexOf("#") === 0 ||
          rawHref.includes(".pdf") ||
          rawHref.includes(".svg")
        )
      )
    ) {
      var prefetchLink = element.href;
      async function myFetch() {
        let response = await fetch(prefetchLink);
        let fragment = document.createElement("template");
        fragment.innerHTML = await response.text();
        let ct = await response.headers.get("content-type");
        if (ct.includes("text/html")) {
          element.addEventListener("click", function (e) {
            if (!e.ctrlKey && !e.metaKey) {
              e.preventDefault();
              fetchNote(element.getAttribute("href"), this.dataset.level);
            }
          });
        }
        updateLinkStatuses();
      }
      return myFetch();
    }
  });
}

window.addEventListener("popstate", function (event) {
  // TODO: check state and pop pages if possible, rather than reloading.
  window.location = window.location; // this reloads the page.
});

window.onload = function () {
  initializePage(document.querySelector(".page"));

  let stacks = [];
  uri = URI(window.location);
  if (uri.hasQuery("stackedNotes")) {
    stacks = uri.query(true).stackedNotes;
    if (!Array.isArray(stacks)) {
      stacks = [stacks];
    }
    for (let i = 0; i < stacks.length; i++) {
      fetchNote(stacks[i], i + 1);
    }
  }
};
