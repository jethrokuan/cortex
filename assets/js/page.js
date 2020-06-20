let pages = [window.location.pathname];
let switchDirectionWindowWidth = 900;
let animationLength = 500;

function isUrlAbsolute(url) {
  return url.indexOf("://") > 0 || url.indexOf("//") === 0;
}

function prefetch(link) {
  var subpages = ["embed.html", "page.html"];
  subpages.forEach(function (subpage) {
    var prefetchLink = document.createElement("link");
    prefetchLink.href = link.href + "embed.html";
    prefetchLink.rel = "prefetch";
    prefetchLink.as = "fetch";
    document.head.appendChild(prefetchLink);
  });
}

function stackNote(href, level) {
  level = Number(level) || pages.length;
  href = URI(href)
  uri = URI(window.location)
  stacks = []
  if (uri.hasQuery("stackedNotes")) {
    stacks = uri.query(true).stackedNotes
    if (!Array.isArray(stacks)) {
      stacks = [stacks]
    }
    stacks = stacks.slice(0, level-1)
  }
  stacks.push(href.path())
  uri.setQuery("stackedNotes", stacks)

  old_stacks = stacks.slice(0, level-1)
  state = {"stacks": old_stacks, "level": level}
  console.log(state)
  window.history.pushState(
    state,
    "",
    uri.href()
  );
}

function unstackNotes(level) {
    let container = document.querySelector("div.grid");
    let children = Array.prototype.slice.call(container.children);

    for (let i = level; i < pages.length; i++) {
      container.removeChild(children[i]);
      destroyPreviews(children[i]);
    }
    pages = pages.slice(0, level);
}

function fetchNote(href, level, animate=false) {
  level = Number(level) || pages.length;

  const request = new Request(href + "/page.html");
  fetch(request).then(function (response) {
    response.text().then(function (text) {
      unstackNotes(level)
      let container = document.querySelector("div.grid");
      let fragment = document.createElement("template");
      fragment.innerHTML = text;
      let element = fragment.content.querySelector(".page");
      container.appendChild(element);
      pages.push(href);
      if (animate) {
        element.animate([{ opacity: 0 }, { opacity: 1 }], animationLength);
      }
      window.MathJax.typeset();

      setTimeout(
        function (element, level) {
          element.dataset.level = level + 1;
          initializePreviews(element, level + 1);
          element.scrollIntoView();
        }.bind(null, element, level),
        10
      );

      updateLinkStatuses();
    });
  });
}

function updateLinkStatuses() {
  let links = Array.prototype.slice.call(
    document.querySelectorAll("a[data-uuid]")
  );

  links.forEach(function (link) {
    if (pages.indexOf(link.dataset.uuid) !== -1) {
      link.classList.add("linked");
      if (link._tippy) link._tippy.disable();
    } else {
      link.classList.remove("linked");
      if (link._tippy) link._tippy.enable();
    }
  });
}

function destroyPreviews(page) {
  links = Array.prototype.slice.call(page.querySelectorAll("a[data-uuid]"));
  links.forEach(function (link) {
    if (link.hasOwnProperty("_tippy")) {
      link._tippy.destroy();
    }
  });
}

let tippyOptions = {
  allowHTML: true,
  theme: "light",
  interactive: true,
  interactiveBorder: 10,
  delay: 100,
  //touch: 'hold',
  touch: "none",
  maxWidth: "none",
  inlinePositioning: false,
  placement: "right",
};

function createPreview(link, overrideOptions) {
  level = Number(link.dataset.level);
  console.log(link.href);
  tip = tippy(
    link,
    Object.assign(
      {},
      tippyOptions,
      {
        content:
          '<iframe width="400px" height="300px" src="' +
          link.href +
          '/embed.html"></iframe>',
      },
      overrideOptions
    )
  );
}

function initializePreviews(page, level) {
  level = level || pages.length;

  links = Array.prototype.slice.call(page.querySelectorAll("a"));

  links.forEach(function (element) {
    prefetch(element);
    element.dataset.level = level;

    if (element.hostname === window.location.hostname) {
      createPreview(element, {
        placement:
          window.innerWidth > switchDirectionWindowWidth ? "right" : "top",
      });

      element.addEventListener("click", function (e) {
        if (!e.ctrlKey && !e.metaKey) {
          // Check if the link is an ox-hugo link. If so link to it normally
          if (!element.href.includes("/ox-hugo/")) {
	    e.preventDefault();
            stackNote(element.href, this.dataset.level);
            fetchNote(element.href, this.dataset.level, (animate = true));
          }
        }
      });
    }
  });
}


window.addEventListener('popstate', function(event) {
  // TODO: check state and pop pages if possible, rather than reloading.
  window.location = window.location  // this reloads the page.
});

(function () {
  initializePreviews(document.querySelector(".page"));

  uri = URI(window.location)
  if (uri.hasQuery("stackedNotes")) {
    stacks = uri.query(true).stackedNotes
    if (!Array.isArray(stacks)) {
      stacks = [stacks]
    }
    for (let i = 1; i <= stacks.length; i++) {
      fetchNote(stacks[i-1], i)
    }
  }
})();
