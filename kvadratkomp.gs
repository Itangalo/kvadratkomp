// This script depends on the library found at https://github.com/silentmatt/js-expression-eval
// Thanks to everyone involved in creating it.

var debugMode = false;

// Builds the UI for this app.
function doGet() {
  var app = UiApp.createApplication();
  var container = app.createVerticalPanel();
  app.add(container);

  container.add(app.createVerticalPanel().setId('question').setSpacing(4));
  container.add(app.createHorizontalPanel().setId('answer').setSpacing(4).setStyleAttribute('background', 'yellow').setVerticalAlignment(UiApp.VerticalAlignment.MIDDLE));
  container.add(app.createVerticalPanel().setId('streak').setSpacing(4).setHorizontalAlignment(UiApp.HorizontalAlignment.RIGHT).setWidth('100%'));
  container.add(app.createVerticalPanel().setId('feedback').setSpacing(4));
  container.add(app.createVerticalPanel().setId('help').setSpacing(4));
  
  if (Session.getActiveUser().getEmail() == '') {
    container.add(app.createHTML('<hr/><em>Du är inte inloggad. Om någon annan använder den här appen samtidigt som du<br/> kommer koefficienterna i uttryck att ändras när de svarar rätt. Logga in på Google om<br/> du vill använda appen på riktigt.</em>', true));
  }
  if (debugMode == true) {
    app.add(app.createTextArea().setId('debug').setWidth('200px').setHeight('200px'));
  }

  buildQuestion();
  buildAnswerForm();
  buildStreak();
  buildHelp();
  
  return app;
}

// Loads the parameters for a selected user.
// Resets parameters if reset == true. The streak parameter can be either
// 'increase' or 'reset', or just omitted.
function getUserParameters(reset, streak) {
  var userId = Session.getActiveUser().getEmail() || 'anonymous';
  var parameters = JSON.parse(ScriptProperties.getProperty(userId));
  
  if (parameters == null) {
    parameters = {
      streak : 0,
      max : 0,
    };
    ScriptProperties.setProperty(userId, JSON.stringify(parameters));
  }
  
  if (reset == true || parameters.a == undefined) {
    parameters.a = randomInt(-4, 4, [0]),
    parameters.b = randomInt(-20, 20, [0]),
    parameters.c = randomInt(-20, 20, [0]) * 2 * parameters.a,
    ScriptProperties.setProperty(userId, JSON.stringify(parameters));
  }
  
  if (streak == 'increase') {
    parameters.streak++;
    if (parameters.streak >= parameters.max) {
      parameters.max = parameters.streak;
    }
    ScriptProperties.setProperty(userId, JSON.stringify(parameters));
  }
  if (streak == 'reset') {
    parameters.streak = 0;
    ScriptProperties.setProperty(userId, JSON.stringify(parameters));
  }

  return parameters;
}

// Helper function to get a random integer between lower and higher. Any
// disallowed values are passed as an array in the disallowed argument.
function randomInt(lower, higher, disallowed) {
  var rnd = Math.ceil(Math.random() * (higher - lower + 1)) + lower - 1;
  if (disallowed.indexOf(rnd) >= 0) {
    rnd = randomInt(lower, higher, disallowed);
  }
  return rnd;
}

// Populates the panel with the question.
function buildQuestion() {
  // The the panel to store content in, and the necessary parameters.
  var app = UiApp.getActiveApplication();
  var panel = app.getElementById('question').clear();
  var parameters = getUserParameters();
  
  // Build the question.
  panel.add(app.createHTML('Kvadratkomplettera <strong>' + parameters.a + 'x² + ' + parameters.b + 'x + ' + parameters.c + '</strong> till formen a(x + d)² + e.'));
  panel.add(app.createLabel('Ange värdena på a, d och e som bråktal eller i exakt decimalform (inte avrundat).'));
  return app;
}

// Populates the panel where the answer is entered.
function buildAnswerForm() {
  var app = UiApp.getActiveApplication();
  var panel = app.getElementById('answer').clear();
  var handler = app.createServerHandler('checkAnswer');
  
  var a = app.createTextBox().setName('a').setId('a');
  var d = app.createTextBox().setName('d').setId('d');
  var e = app.createTextBox().setName('e').setId('e');
  handler.addCallbackElement(a);
  handler.addCallbackElement(d);
  handler.addCallbackElement(e);
  
  panel.add(app.createLabel('a = '));
  panel.add(a);
  panel.add(app.createLabel('d = '));
  panel.add(d);
  panel.add(app.createLabel('e = '));
  panel.add(e);
  
  panel.add(app.createButton('Kolla svaret', handler));
  return app;
}

// Handler for evaluating an answer.
function checkAnswer(eventInfo) {
  var correct = getUserParameters();
  var answer = {};
  answer.a = sanitizeNumber(eventInfo.parameter.a);
  answer.d = sanitizeNumber(eventInfo.parameter.d);
  answer.e = sanitizeNumber(eventInfo.parameter.e);
  
  var incorrect = {};
  if (answer.a != correct.a) {
    incorrect.a = true;
  }
  if (2 * answer.a * answer.d != correct.b) {
    incorrect.d = true;
  }
  if (answer.a * answer.d * answer.d + answer.e != correct.c) {
    incorrect.e = true;
  }
  
  var app = UiApp.getActiveApplication();
  var feedback = '';
  if (incorrect.a == true) {
    feedback += 'Värdet på a stämmer inte.<br/>';
  }
  if (incorrect.d == true) {
    feedback += 'Värdet på d stämmer inte.<br/>';
  }
  if (incorrect.e == true) {
    feedback += 'Värdet på e stämmer inte.<br/>';
  }
  if (feedback == '') {
    feedback = 'Rätt!';
    getUserParameters(true, 'increase');
    buildQuestion();
    buildAnswerForm();
  }
  else {
    getUserParameters(false, 'reset');
  }
  buildStreak();
 
  app.getElementById('feedback').clear().add(app.createHTML(feedback));

  return app;
}

// Populates the panel where the current streak + max is displayed.
function buildStreak() {
  var app = UiApp.getActiveApplication();
  var panel = app.getElementById('streak').clear();
  var parameters = getUserParameters();
  panel.add(app.createLabel('Antal rätt i rad: ' + parameters.streak));
  panel.add(app.createLabel('Bästa serie: ' + parameters.max));
  return app;
}

// Populates the panel with help information.
function buildHelp() {
  var app = UiApp.getActiveApplication();
  var panel = app.getElementById('help').clear();
  panel.add(app.createAnchor('Videor och andra resurser för att lära sig kvadratkomplettering', 'http://kursplanering.se/avsnitt/omvandla-andragradsuttryck-till-kvadratkompletterad-form'));
  return app;
}

// Helper function returning a float if number is a valid expression, otherwise 0.
function sanitizeNumber(number) {
  number = number.replace(',', '.');
  try {
    var number = Parser.parse(number).evaluate();
  }
  catch(e) {
    return 0;
  }
  return number;
}

// Used for development only.
function debug(variable) {
  if (debugMode != true) {
    return;
  }
  var app = UiApp.getActiveApplication();
  var debug = app.getElementById('debug');
  
  if (typeof variable == 'object') {
    var output = '';
    for (var i in variable) {
      output += '  ' + i + ' : ' + variable[i] + '\r';
    }
  }
  else {
    var output = typeof variable + ' : ' + variable;
  }
  
  debug.setText(output);
  return app;
}
