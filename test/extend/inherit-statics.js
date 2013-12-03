/**
 * test Constructor.extend() calls with "static" 
 *
 *  author:   @dfkaye - david.kaye
 *	date:	2012-10-30
 * 
 * This short suite explores the anti-pattern of attempting to inherit statics.
 *
 * The example is taken from Programming in CoffeeScript by Mark Bates, Addison-Wesley, pp. 147-150, 
 * where the author shows that CoffeeScript does not support static inheritance through the __super__ 
 * keyword.  However, the example contains a more fundamental problem NOT specific to CoffeeScript.
 */

var test = require('tape');
var Constructor = require('../../Constructor.js').Constructor;

// our base  and inheriting constructors
var Employee, Manager;

Employee = function Employee() {
    Employee.hire(this);
};

Employee.hire = function hire(employee) {
    this.employees || (this.employees = []);
    
    return this.employees.push(employee);
};

Employee.total = function total() {
    return this.employees.length;
};

/*
 * First test that the Employee creation works.
 */
test('create employees', function (t) {

    var total = 4;
    
    for (var i = 0; i < total; i += 1) {
        new Employee();
    }
    
    t.strictEquals(Employee.total(), total);
    t.end();
});


/*
 * now inherit from Employee
 */
Manager = Constructor.extend(Employee, {
    constructor: function () {
        this.__super__();
    },
    type: 'Manager'
});

test('inherit static', function (t) {    

    /*
      * The book's example, showing the JavaScript generated by the CoffeeScript transpiler:
      *
      *  Manager.total = function total() {
      *    return this.__super__.constructor.total.apply(this, arguments);
      *  };
      *
      * This fails because the __super__ is NOT the constructor.
      *
      * You have to access the __super__'s prototype.constructor instead ~ which CoffeeScript's super does
      * not provide you access to (because CS syntax does not expose it).
      * 
      * In the case of Constructor.js, you can call the desired method directly, as below:
      */
    Manager.total = function total() {
        return this.__super__.prototype.constructor.total();
    };

    /*
      * But now see that when verifying Manager creation, we're actually reaching for the wrong scope -
      * which is on the Employee, rather than the Manager.  At the static level - the previously 
      * created Employee count will be incremented, rather than specific to the Manager constructor.
      */
    
    var employeeCount = Employee.total();
    var total = 4;
    t.strictEquals(employeeCount, total, 'should have 4 employees initially');
    
    // create 4 Managers
    for (var i = 0; i < total; i += 1) {
        new Manager();
    }
    
    t.strictEquals(Employee.total(), total + employeeCount, 'should have 8 employees');

    // passes!  Manager.total() already gets the initial total from employee because
    // employee.total does not check for
    t.strictEquals(Manager.total(), Employee.total(), 'should fail - should only be 4 managers');
    
    t.end();
});


test('fix the static inheritance', function (t) {

    /*
     *  We could try to fix this by checking object types in the __super__'s employees collection...
     */
    Manager.total = function total() {
    
        var employees = this.__super__.prototype.constructor.employees;
        var total = 0;

        for (var i = 0; i < employees.length; i += 1) {
        
            if (employees[i] instanceof Manager || employees[i].type == 'Manager') {
                total += 1;
            }            
        }
        
        return total;
    };
    
    /*
      * ... but in fact, by passing the instance handling to the __super__ class, the instance that is 
      * stored has not finished processing by the subclass constructor ~ unbelievable ~ so the 
      * instanceof check for Manager - and even the prototype 'type' attribute check - ALWAYS fails!
      */
    t.equal(Manager.total(), 0, 'no managers were found! should be 4...');
    t.end();
});

/*
 *  So what is the correct solution?
 *
 *  1) store instances in something like an instance store, such as EmployeeList, ManagerList, Payroll.
 *
 *  2) don't do actual work like that in the constructor.
 *  
 */
